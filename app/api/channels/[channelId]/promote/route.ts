import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import prisma from "@/lib/prismadb";

// POST /api/channels/[channelId]/promote - Promote a user to channel owner
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
        const { userId } = body; // The ID of the user to promote to owner

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

        // Check if the requester is the current owner of the channel
        if (channel.ownerId !== session.user.id) {
            return NextResponse.json(
                { error: "Only the current channel owner can promote members" },
                { status: 403 }
            );
        }

        // Check if the user to promote exists
        const userToPromote = await prisma.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!userToPromote) {
            return NextResponse.json({ error: "User to promote not found" }, { status: 404 });
        }

        // Check if the user is a member of the channel
        const isMember = channel.members.some(
            (member) => member.id === userId
        );

        if (!isMember) {
            return NextResponse.json(
                { error: "User must be a member of the channel to be promoted" },
                { status: 400 }
            );
        }

        // Add the previous owner as an admin
        const previousOwnerId = channel.ownerId;

        // First update channel owner
        await prisma.channel.update({
            where: {
                id: channelId
            },
            data: {
                ownerId: userId
            }
        });

        // Make sure the new owner is also an admin
        await prisma.channelAdmin.create({
            data: {
                userId: userId,
                channelId: channelId
            }
        });

        // Make sure previous owner remains an admin
        const existingAdminRecord = await prisma.channelAdmin.findFirst({
            where: {
                userId: previousOwnerId,
                channelId: channelId
            }
        });

        if (!existingAdminRecord) {
            await prisma.channelAdmin.create({
                data: {
                    userId: previousOwnerId,
                    channelId: channelId
                }
            });
        }

        return NextResponse.json({
            success: true,
            message: `${userToPromote.name} is now the owner of this channel`
        }, { status: 200 });
    } catch (error) {
        console.error("Error promoting user to channel owner:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
