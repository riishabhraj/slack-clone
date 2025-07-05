import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prismadb";

// POST /api/channels/[channelId]/make-admin - Make a user an admin of a channel
export async function POST(
    request: Request,
    { params }: { params: { channelId: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { channelId } = params;
        const body = await request.json();
        const { userId } = body; // The ID of the user to make admin

        if (!channelId) {
            return NextResponse.json({ error: "Channel ID is required" }, { status: 400 });
        }

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Check if channel exists
        const channel = await prisma.channel.findUnique({
            where: {
                id: channelId
            },
            include: {
                members: {
                    select: {
                        id: true
                    }
                },
                channelAdmins: {
                    select: {
                        userId: true
                    }
                }
            }
        });

        if (!channel) {
            return NextResponse.json({ error: "Channel not found" }, { status: 404 });
        }

        // Check if the requester is an admin or owner of the channel
        const isRequesterOwner = channel.ownerId === session.user.id;
        const isRequesterAdmin = channel.channelAdmins.some(
            admin => admin.userId === session.user.id
        );

        if (!isRequesterOwner && !isRequesterAdmin) {
            return NextResponse.json(
                { error: "Only channel owners and admins can make others admin" },
                { status: 403 }
            );
        }

        // Check if the user to make admin exists
        const userToPromote = await prisma.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!userToPromote) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if the user is a member of the channel
        const isMember = channel.members.some(
            member => member.id === userId
        );

        if (!isMember) {
            return NextResponse.json(
                { error: "User must be a member of the channel to be made admin" },
                { status: 400 }
            );
        }

        // Check if the user is already an admin
        const isAlreadyAdmin = channel.channelAdmins.some(
            admin => admin.userId === userId
        );

        if (isAlreadyAdmin) {
            return NextResponse.json({ error: "User is already an admin of this channel" }, { status: 400 });
        }

        // Add the user to the admins
        await prisma.channelAdmin.create({
            data: {
                userId: userId,
                channelId: channelId
            }
        });

        return NextResponse.json({
            success: true,
            message: `${userToPromote.name} is now an admin of this channel`
        }, { status: 200 });
    } catch (error) {
        console.error("Error making user an admin:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
