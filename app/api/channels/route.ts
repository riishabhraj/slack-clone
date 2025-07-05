import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import prisma from "@/lib/prismadb";

// GET /api/channels - Fetch all channels
export async function GET() {
    try {
        // Check if user is authenticated
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch all channels, ordered by creation date
        const channels = await prisma.channel.findMany({
            orderBy: {
                createdAt: "desc"
            },
            // Include member count, latest message, owner and admin information
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
                channelAdmins: {
                    select: {
                        userId: true
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

        // Map channels to include isMember flag and isAdmin flag
        const processedChannels = channels.map((channel: any) => {
            // Extract admin user IDs from channelAdmins
            const adminUserIds = channel.channelAdmins?.map((admin: any) => admin.userId) || [];

            return {
                ...channel,
                isMember: channel.members.length > 0,
                isAdmin: adminUserIds.includes(session.user.id),
                adminUserIds, // Include the list of admin user IDs
                members: undefined, // Remove the members array
                channelAdmins: undefined, // Remove the channelAdmins array
                latestMessage: channel.messages[0] || null,
                messages: undefined, // Remove the messages array
                memberCount: channel._count.members,
                _count: undefined // Remove the _count object
            };
        });

        return NextResponse.json(processedChannels);
    } catch (error) {
        console.error("Error fetching channels:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

// POST /api/channels - Create a new channel
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check that user ID is available
        if (!session?.user?.id) {
            return NextResponse.json({ error: "User ID is missing from session" }, { status: 400 });
        }

        // Test database connection
        try {
            const dbTest = await prisma.user.count();
            console.log("Database connection test successful. User count:", dbTest);
        } catch (dbError: any) {
            console.error("Database connection test failed:", dbError);
            return NextResponse.json({
                error: "Database connection error",
                message: dbError?.message || 'Unknown error'
            }, { status: 500 });
        }

        const body = await request.json();
        const { name, description, isPrivate } = body;

        if (!name || typeof name !== "string") {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        // Check if channel with this name already exists
        const existingChannel = await prisma.channel.findUnique({
            where: {
                name
            }
        });

        if (existingChannel) {
            return NextResponse.json({ error: "Channel name already taken" }, { status: 409 });
        }

        // Get user ID and validate it exists in database
        const userId = session.user.id;

        if (!userId || typeof userId !== 'string') {
            console.error("Missing or invalid user ID in session:", session);
            return NextResponse.json({
                error: "Invalid user ID in session",
                details: JSON.stringify(session.user)
            }, { status: 400 });
        }

        // Verify that the user exists in the database
        let user;
        try {
            user = await prisma.user.findUnique({
                where: {
                    id: userId
                }
            });

            if (!user) {
                console.error(`User with ID ${userId} not found in database`);
                return NextResponse.json({
                    error: "User not found",
                    message: `User with ID ${userId} not found in database`
                }, { status: 404 });
            }
        } catch (findUserError: any) {
            console.error("Error finding user:", findUserError);
            return NextResponse.json({
                error: "Database error",
                message: `Error while finding user: ${findUserError?.message || 'Unknown error'}`
            }, { status: 500 });
        }

        // Create the channel with explicit checks
        let channel;
        try {
            channel = await prisma.channel.create({
                data: {
                    name,
                    description: description || null,  // Ensure description is never undefined
                    isPrivate: Boolean(isPrivate),     // Ensure it's a boolean
                    ownerId: userId,                   // Direct assignment to avoid connect issue
                    members: {
                        connect: {
                            id: userId // Auto-add creator as a member
                        }
                    }
                }
            });
        } catch (createChannelError: any) {
            console.error("Error creating channel:", createChannelError);
            return NextResponse.json({
                error: "Failed to create channel",
                message: createChannelError?.message || 'Unknown error'
            }, { status: 500 });
        }

        // Create the admin record for the channel owner using the verified userId
        try {
            await prisma.channelAdmin.create({
                data: {
                    userId: userId,
                    channelId: channel.id
                }
            });
        } catch (adminError) {
            console.error("Error creating admin record:", adminError);
            // Continue even if admin record creation fails to ensure channel is created
        }

        return NextResponse.json(channel);
    } catch (error: any) {
        console.error("Error creating channel:", error);

        // Provide more specific error message for Prisma errors
        if (error?.code === 'P2025') {
            return NextResponse.json({
                error: "Record not found",
                message: error.meta?.cause || 'Unknown cause'
            }, { status: 404 });
        } else if (error?.code) {
            return NextResponse.json({
                error: "Database error",
                code: error.code,
                message: error.message || ''
            }, { status: 500 });
        }

        return NextResponse.json({
            error: "Internal error",
            message: error?.message || 'Unknown error'
        }, { status: 500 });
    }
}
