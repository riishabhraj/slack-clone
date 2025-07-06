import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import prisma from "@/lib/prismadb";

// GET /api/channels/[channelId] - Get channel details
export async function GET(
    request: Request,
    { params }: { params: Promise<{ channelId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { channelId } = await params;

        if (!channelId) {
            return NextResponse.json({ error: "Channel ID is required" }, { status: 400 });
        }

        // Fetch channel with details
        const channel = await prisma.channel.findUnique({
            where: {
                id: channelId
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                },
                members: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        email: true
                    }
                },
                channelAdmins: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                                email: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        members: true,
                        messages: true
                    }
                }
            }
        });

        if (!channel) {
            return NextResponse.json({ error: "Channel not found" }, { status: 404 });
        }

        // Check if user is a member of this channel
        const isMember = channel.members.some((member: { id: string }) => member.id === session.user.id);

        // For private channels, only members can see details
        if (channel.isPrivate && !isMember) {
            return NextResponse.json(
                {
                    error: "ACCESS_DENIED",
                    message: "You don't have access to this private channel"
                },
                { status: 403 }
            );
        }

        // Process admin information from channelAdmins
        const admins = channel.channelAdmins.map((admin) => admin.user);
        const adminUserIds = admins.map((admin) => admin.id);
        const isAdmin = adminUserIds.includes(session.user.id) || channel.ownerId === session.user.id;

        return NextResponse.json({
            ...channel,
            isMember,
            isAdmin,
            adminUserIds,
            admins,
            channelAdmins: undefined, // Remove the channelAdmins object from response
            memberCount: channel._count.members,
            messageCount: channel._count.messages,
            _count: undefined // Remove the _count object from response
        });
    } catch (error) {
        console.error("Error fetching channel:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

// PUT /api/channels/[channelId] - Update channel
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ channelId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { channelId } = await params;
        const body = await request.json();
        const { name, description, isPrivate } = body;

        if (!channelId) {
            return NextResponse.json({ error: "Channel ID is required" }, { status: 400 });
        }

        // Verify channel exists
        const channel = await prisma.channel.findUnique({
            where: {
                id: channelId
            }
        });

        if (!channel) {
            return NextResponse.json({ error: "Channel not found" }, { status: 404 });
        }

        // Only the owner can update the channel
        if (channel.ownerId !== session.user.id) {
            return NextResponse.json({ error: "You don't have permission to update this channel" }, { status: 403 });
        }

        // If updating name, check if new name is not already taken
        if (name && name !== channel.name) {
            const existingChannel = await prisma.channel.findUnique({
                where: {
                    name
                }
            });

            if (existingChannel) {
                return NextResponse.json({ error: "Channel name already taken" }, { status: 409 });
            }
        }

        // Update the channel
        const updatedChannel = await prisma.channel.update({
            where: {
                id: channelId
            },
            data: {
                name: name || undefined,
                description: description !== undefined ? description : undefined,
                isPrivate: isPrivate !== undefined ? isPrivate : undefined
            }
        });

        return NextResponse.json(updatedChannel);
    } catch (error) {
        console.error("Error updating channel:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

// DELETE /api/channels/[channelId] - Delete channel
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ channelId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { channelId } = await params;

        if (!channelId) {
            return NextResponse.json({ error: "Channel ID is required" }, { status: 400 });
        }

        // Verify channel exists
        const channel = await prisma.channel.findUnique({
            where: {
                id: channelId
            }
        });

        if (!channel) {
            return NextResponse.json({ error: "Channel not found" }, { status: 404 });
        }

        // Only the owner can delete the channel
        if (channel.ownerId !== session.user.id) {
            return NextResponse.json({ error: "You don't have permission to delete this channel" }, { status: 403 });
        }

        // Delete all messages in the channel first (cascade delete will handle this if configured)
        await prisma.message.deleteMany({
            where: {
                channelId
            }
        });

        // Delete the channel
        await prisma.channel.delete({
            where: {
                id: channelId
            }
        });

        return NextResponse.json({ success: true, message: "Channel deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("Error deleting channel:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
