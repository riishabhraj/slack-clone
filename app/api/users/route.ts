import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth/options";
import prisma from '@/lib/prismadb';

export async function GET(req: NextRequest) {
    try {
        // Get the current session
        const session = await getServerSession(authOptions);

        // Only allow authenticated users
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get all users (exclude sensitive information)
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                isVerified: true,
            }
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error('[API] Users fetch error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
