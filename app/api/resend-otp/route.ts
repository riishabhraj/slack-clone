import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';
import { generateOTP, hashOTP, getOTPExpiry, calculateLockUntil } from '@/lib/auth/otp';
import { sendOTPEmail } from '@/lib/auth/email';
import { ExtendedUser } from '@/types/prisma';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { success: false, message: 'Email is required' },
                { status: 400 }
            );
        }

        // Find the user by email
        const user = await prisma.user.findUnique({
            where: { email },
        }) as unknown as ExtendedUser;

        if (!user) {
            // Don't reveal that the user doesn't exist for security
            return NextResponse.json(
                { success: true, message: 'If your email exists in our system, a new code has been sent' },
                { status: 200 }
            );
        }

        // Check if account is already verified
        if (user.isVerified) {
            return NextResponse.json({
                success: false,
                message: 'Account already verified. Please login.',
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
                    message: `Too many attempts. Try again in ${timeLeft} minutes.`,
                    locked: true,
                    lockExpires: user.verificationLockUntil
                },
                { status: 429 }
            );
        }

        // Generate new OTP
        const otp = generateOTP();
        const hashedOtp = await hashOTP(otp);
        const otpExpires = getOTPExpiry();

        // Update user with new OTP using raw SQL to bypass Prisma schema validation
        await prisma.$executeRaw`
      UPDATE "User"
      SET "hashedOtp" = ${hashedOtp},
          "otpExpires" = ${otpExpires},
          "verificationAttempts" = 0
      WHERE id = ${user.id}
    `;

        // Send OTP email
        await sendOTPEmail(email, otp, user.name);

        return NextResponse.json({
            success: true,
            message: 'New verification code sent to your email',
        });

    } catch (error) {
        console.error('Resend OTP error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to send verification code' },
            { status: 500 }
        );
    }
}
