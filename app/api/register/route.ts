import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";
import { generateOTP, hashOTP, getOTPExpiry } from "@/lib/auth/otp";
import { sendOTPEmail } from "@/lib/auth/email";
import { ExtendedUser } from "@/types/prisma";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, password } = body;

        if (!name || !email || !password) {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: {
                email
            }
        }) as unknown as ExtendedUser;

        if (existingUser) {
            // If user exists but isn't verified, we can update the OTP
            if (!existingUser.isVerified) {
                // Generate new OTP
                const otp = generateOTP();
                const hashedOtp = await hashOTP(otp);
                const otpExpires = getOTPExpiry();

                // Update user with new OTP using raw SQL
                await prisma.$executeRaw`
                    UPDATE "User"
                    SET "hashedOtp" = ${hashedOtp},
                        "otpExpires" = ${otpExpires},
                        "verificationAttempts" = 0,
                        "verificationLockUntil" = NULL
                    WHERE id = ${existingUser.id}
                `;

                // Send OTP email
                await sendOTPEmail(email, otp, name);

                return NextResponse.json({
                    message: "OTP sent to your email for verification",
                    success: true,
                    email,
                    requiresVerification: true
                });
            }

            return NextResponse.json(
                { message: "Email already in use" },
                { status: 400 }
            );
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Generate OTP for verification
        const otp = generateOTP();
        const hashedOtp = await hashOTP(otp);
        const otpExpires = getOTPExpiry();

        // First create user with standard fields
        const user = await prisma.user.create({
            data: {
                name,
                email,
                hashedPassword
            }
        });

        // Then update with verification data using raw SQL
        await prisma.$executeRaw`
            UPDATE "User"
            SET "hashedOtp" = ${hashedOtp},
                "otpExpires" = ${otpExpires},
                "isVerified" = false
            WHERE id = ${user.id}
        `;

        // Send OTP email
        await sendOTPEmail(email, otp, name);

        // Return success with verification required
        return NextResponse.json({
            message: "Registration successful. Please verify your email.",
            success: true,
            email: user.email,
            requiresVerification: true
        });
    } catch (error: any) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { message: "Error creating user", success: false },
            { status: 500 }
        );
    }
}
