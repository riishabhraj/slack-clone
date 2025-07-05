import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prismadb";

// POST /api/channels/[channelId]/invite - Invite a user to a channel
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
        const { userId } = body; // The ID of the user to invite

        if (!channelId) {
            return NextResponse.json({ error: "Channel ID is required" }, { status: 400 });
        }

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Check if channel exists and get owner/admin information
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

        // Check if the requester is a member of the channel
        const isRequesterMember = channel.members.some(
            (member) => member.id === session.user.id
        );

        if (!isRequesterMember) {
            return NextResponse.json(
                { error: "You must be a channel member to invite others" },
                { status: 403 }
            );
        }

        // Check if the requester is an owner or admin of the channel
        const isRequesterOwner = channel.ownerId === session.user.id;
        const isRequesterAdmin = channel.channelAdmins.some(
            admin => admin.userId === session.user.id
        );

        if (!isRequesterOwner && !isRequesterAdmin) {
            return NextResponse.json(
                { error: "Only channel owners and admins can invite users" },
                { status: 403 }
            );
        }

        // Check if the user to invite exists
        const userToInvite = await prisma.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!userToInvite) {
            return NextResponse.json({ error: "User to invite not found" }, { status: 404 });
        }

        // Check if the user is already a member
        const isAlreadyMember = channel.members.some(
            (member) => member.id === userId
        );

        if (isAlreadyMember) {
            return NextResponse.json({ error: "User is already a member of this channel" }, { status: 400 });
        }

        // Add the user to the channel
        await prisma.channel.update({
            where: {
                id: channelId
            },
            data: {
                members: {
                    connect: {
                        id: userId
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            message: `${userToInvite.name} has been added to the channel`
        }, { status: 200 });
    } catch (error) {
        console.error("Error inviting user to channel:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
