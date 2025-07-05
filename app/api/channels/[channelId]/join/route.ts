import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import prisma from "@/lib/prismadb";

// POST /api/channels/[channelId]/join - Join a channel
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

        if (!channelId) {
            return NextResponse.json({ error: "Channel ID is required" }, { status: 400 });
        }

        // Check if channel exists
        const channel = await prisma.channel.findUnique({
            where: {
                id: channelId
            }
        });

        if (!channel) {
            return NextResponse.json({ error: "Channel not found" }, { status: 404 });
        }

        // Check if user is already a member of the channel
        const membership = await prisma.channel.findFirst({
            where: {
                id: channelId,
                members: {
                    some: {
                        id: session.user.id as string
                    }
                }
            }
        });

        if (membership) {
            return NextResponse.json({ error: "User is already a member of this channel" }, { status: 409 });
        }

        // Add user to the channel
        await prisma.channel.update({
            where: {
                id: channelId
            },
            data: {
                members: {
                    connect: {
                        id: session.user.id as string
                    }
                }
            }
        });

        return NextResponse.json({ success: true, message: "Joined channel successfully" }, { status: 200 });
    } catch (error) {
        console.error("Error joining channel:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

// DELETE /api/channels/[channelId]/join - Leave a channel
export async function DELETE(
    request: Request,
    { params }: { params: { channelId: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { channelId } = params;

        if (!channelId) {
            return NextResponse.json({ error: "Channel ID is required" }, { status: 400 });
        }

        // Check if channel exists
        const channel = await prisma.channel.findUnique({
            where: {
                id: channelId
            }
        });

        if (!channel) {
            return NextResponse.json({ error: "Channel not found" }, { status: 404 });
        }

        // Check if user is trying to leave a channel they own
        if (channel.ownerId === session.user.id) {
            return NextResponse.json({ error: "Channel owner cannot leave their own channel" }, { status: 403 });
        }

        // Check if user is a member of the channel
        const membership = await prisma.channel.findFirst({
            where: {
                id: channelId,
                members: {
                    some: {
                        id: session.user.id as string
                    }
                }
            }
        });

        if (!membership) {
            return NextResponse.json({ error: "User is not a member of this channel" }, { status: 404 });
        }

        // Remove user from the channel
        await prisma.channel.update({
            where: {
                id: channelId
            },
            data: {
                members: {
                    disconnect: {
                        id: session.user.id as string
                    }
                }
            }
        });

        return NextResponse.json({ success: true, message: "Left channel successfully" }, { status: 200 });
    } catch (error) {
        console.error("Error leaving channel:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
