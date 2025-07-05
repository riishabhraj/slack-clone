import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import prisma from "@/lib/prismadb";
import { emitNewMessage } from "@/lib/socket";

// POST /api/messages - Create a new message
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        }

        // Parse the request body
        const body = await request.json();
        const { content, channelId } = body;

        // Validate request
        if (!content) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        if (!channelId) {
            return NextResponse.json({ error: "Channel ID is required" }, { status: 400 });
        }

        // Check if channel exists and user is a member
        const channel = await prisma.channel.findUnique({
            where: { id: channelId },
            include: {
                members: {
                    where: { id: session.user.id },
                    select: { id: true }
                }
            }
        });

        if (!channel) {
            return NextResponse.json({ error: "Channel not found" }, { status: 404 });
        }

        // Check if user is a member of the channel
        if (channel.members.length === 0) {
            return NextResponse.json({ error: "You must be a member of the channel to send messages" }, { status: 403 });
        }

        // Create the message
        const message = await prisma.message.create({
            data: {
                content,
                userId: session.user.id,
                channelId
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                }
            }
        });

        // Emit real-time event for new message
        try {
            emitNewMessage(channelId, message);
        } catch (error) {
            console.error('Error emitting socket event:', error);
            // Continue even if socket emission fails
        }

        return NextResponse.json(message);
    } catch (error) {
        console.error("Error creating message:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

// GET /api/messages?channelId=... - Fetch messages for a channel
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get the channelId from query parameters
        const { searchParams } = new URL(request.url);
        const channelId = searchParams.get("channelId");
        const cursor = searchParams.get("cursor"); // For pagination
        const limit = Number(searchParams.get("limit") || "50");

        if (!channelId) {
            return NextResponse.json({ error: "Channel ID is required" }, { status: 400 });
        }

        // Check if channel exists and user is a member
        const channel = await prisma.channel.findUnique({
            where: { id: channelId },
            include: {
                members: {
                    where: { id: session.user.id },
                    select: { id: true }
                }
            }
        });

        if (!channel) {
            return NextResponse.json({ error: "Channel not found" }, { status: 404 });
        }

        // Check if user is a member of the channel
        if (channel.members.length === 0) {
            return NextResponse.json({ error: "You must be a member of the channel to view messages" }, { status: 403 });
        }

        // Fetch messages with proper cursor handling
        const messages = await prisma.message.findMany({
            where: { channelId },
            orderBy: { createdAt: "desc" },
            take: limit,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                }
            }
        });

        // Get the ID of the last message for the next cursor
        const nextCursor = messages.length > 0 ? messages[messages.length - 1].id : null;

        // Check if there are more messages
        const hasMore = messages.length === limit;

        return NextResponse.json({
            messages: messages.reverse(), // Return in ascending order
            nextCursor,
            hasMore
        });
    } catch (error) {
        console.error("Error fetching messages:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
