import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prismadb";
import { ExtendedUser } from "@/types/prisma";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { success: false, message: "Missing email or password" },
                { status: 400 }
            );
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: {
                email,
            },
        }) as unknown as ExtendedUser;

        // User doesn't exist or password doesn't match
        if (!user || !user.hashedPassword) {
            return NextResponse.json(
                { success: false, message: "Invalid email or password" },
                { status: 401 }
            );
        }

        // Check if user is verified
        if (!user.isVerified) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Account not verified. Please check your email for verification instructions.",
                    requiresVerification: true,
                    email: user.email
                },
                { status: 403 }
            );
        }

        // Compare passwords
        const passwordMatch = await bcrypt.compare(
            password,
            user.hashedPassword
        );

        if (!passwordMatch) {
            return NextResponse.json(
                { success: false, message: "Invalid email or password" },
                { status: 401 }
            );
        }

        // Return user for session creation (excluding sensitive data)
        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { success: false, message: "An error occurred during login" },
            { status: 500 }
        );
    }
}
