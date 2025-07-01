import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prismadb";

// GET /api/channels - Fetch all channels
export async function GET() {
    try {
        // Check if user is authenticated
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Fetch all channels, ordered by creation date
        const channels = await prisma.channel.findMany({
            orderBy: {
                createdAt: "desc"
            },
            // Include member count, latest message, and owner information
            select: {
                id: true,
                name: true,
                description: true,
                isPrivate: true,
                createdAt: true,
                updatedAt: true,
                ownerId: true,
                owner: {
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                },
                _count: {
                    select: {
                        members: true
                    }
                },
                messages: {
                    take: 1,
                    orderBy: {
                        createdAt: "desc"
                    },
                    select: {
                        id: true,
                        content: true,
                        createdAt: true,
                        user: {
                            select: {
                                name: true,
                                image: true
                            }
                        }
                    }
                },
                // Check if current user is a member
                members: {
                    where: {
                        id: session.user.id as string
                    },
                    select: {
                        id: true
                    }
                }
            }
        });

        // Map channels to include isMember flag
        const processedChannels = channels.map((channel: any) => ({
            ...channel,
            isMember: channel.members.length > 0,
            members: undefined, // Remove the members array
            latestMessage: channel.messages[0] || null,
            messages: undefined, // Remove the messages array
            memberCount: channel._count.members,
            _count: undefined // Remove the _count object
        }));

        return NextResponse.json(processedChannels);
    } catch (error) {
        console.error("Error fetching channels:", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

// POST /api/channels - Create a new channel
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await request.json();
        const { name, description, isPrivate } = body;

        if (!name || typeof name !== "string") {
            return new NextResponse("Name is required", { status: 400 });
        }

        // Check if channel with this name already exists
        const existingChannel = await prisma.channel.findUnique({
            where: {
                name
            }
        });

        if (existingChannel) {
            return new NextResponse("Channel name already taken", { status: 409 });
        }

        // Create the channel
        const channel = await prisma.channel.create({
            data: {
                name,
                description,
                isPrivate: isPrivate || false,
                owner: {
                    connect: {
                        id: session.user.id as string
                    }
                },
                members: {
                    connect: {
                        id: session.user.id as string // Auto-add creator as a member
                    }
                }
            }
        });

        return NextResponse.json(channel);
    } catch (error) {
        console.error("Error creating channel:", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}
