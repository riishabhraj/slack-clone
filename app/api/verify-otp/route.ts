import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { verifyOTP, isOTPExpired, calculateLockUntil } from '@/lib/auth/otp';

// Define User type with the new verification fields
interface UserWithVerification {
    id: string;
    name: string | null;
    email: string | null;
    emailVerified: Date | null;
    image: string | null;
    hashedPassword: string | null;
    createdAt: Date;
    updatedAt: Date;
    // Verification fields
    hashedOtp: string | null;
    otpExpires: Date | null;
    isVerified: boolean;
    verificationAttempts: number;
    verificationLockUntil: Date | null;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, otp } = body;

        if (!email || !otp) {
            return NextResponse.json(
                { success: false, message: 'Email and OTP are required' },
                { status: 400 }
            );
        }

        // Find the user by email
        const user = await prisma.user.findUnique({
            where: { email },
        }) as unknown as UserWithVerification;

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 404 }
            );
        }

        // Check if account is already verified
        if (user.isVerified) {
            return NextResponse.json({
                success: true,
                message: 'Account already verified',
                isVerified: true,
            });
        }

        // Check if verification is locked due to too many attempts
        if (user.verificationLockUntil && user.verificationLockUntil > new Date()) {
            const timeLeft = Math.ceil(
                (user.verificationLockUntil.getTime() - new Date().getTime()) / 1000 / 60
            );
            return NextResponse.json(
                {
                    success: false,
                    message: `Verification locked. Try again in ${timeLeft} minutes.`,
                    locked: true,
                    lockExpires: user.verificationLockUntil
                },
                { status: 429 }
            );
        }

        // Check if OTP is expired
        if (!user.otpExpires || isOTPExpired(user.otpExpires)) {
            return NextResponse.json(
                { success: false, message: 'OTP has expired. Please request a new one.' },
                { status: 400 }
            );
        }

        // Verify OTP
        const isValid = await verifyOTP(otp, user.hashedOtp);

        if (!isValid) {
            // Increment verification attempts
            const updatedAttempts = (user.verificationAttempts || 0) + 1;
            const lockUntil = calculateLockUntil(updatedAttempts);

            await prisma.$executeRaw`
                UPDATE "User"
                SET "verificationAttempts" = ${updatedAttempts},
                    "verificationLockUntil" = ${lockUntil}
                WHERE id = ${user.id}
            `;

            return NextResponse.json(
                { success: false, message: 'Invalid OTP. Please try again.' },
                { status: 400 }
            );
        }

        // OTP is valid, mark account as verified
        await prisma.$executeRaw`
            UPDATE "User"
            SET "isVerified" = true,
                "emailVerified" = ${new Date()},
                "hashedOtp" = null,
                "otpExpires" = null,
                "verificationAttempts" = 0,
                "verificationLockUntil" = null
            WHERE id = ${user.id}
        `;

        return NextResponse.json({
            success: true,
            message: 'Account verified successfully',
            isVerified: true,
        });

    } catch (error) {
        console.error('Verification error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to verify account' },
            { status: 500 }
        );
    }
}
