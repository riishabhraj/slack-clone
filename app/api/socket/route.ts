import { Server as SocketIOServer } from 'socket.io';
import { NextResponse } from 'next/server';

// Define interface for connected users
interface ConnectedUser {
    id: string;
    name: string;
    socketId: string;
    isConnected: boolean;
}

// Create a global object to store Socket.IO server instance
declare global {
    var socketIOServer: SocketIOServer | null;
}

if (!global.socketIOServer) {
    global.socketIOServer = null;
}

// Response interface
interface SocketAPIResponse {
    success: boolean;
    message: string;
    connectedUsers: ConnectedUser[];
    serverInfo?: {
        port: number;
        path: string;
    }
}

// Socket.IO API handler - This just reports status, doesn't actually initialize socket server
// The real Socket.IO initialization happens in server.js
export async function GET(req: Request) {
    try {
        // Check if Socket.IO seems to be running based on global variable
        const isSocketServerRunning = global.socketIOServer !== null;

        // Get connected clients count if server is running
        let clientsCount = 0;
        let connectedUsers: ConnectedUser[] = [];

        if (isSocketServerRunning && global.socketIOServer) {
            try {
                // @ts-ignore - accessing internal socket.io properties
                clientsCount = global.socketIOServer.engine?.clientsCount || 0;

                // Get sockets
                const sockets = await global.socketIOServer.fetchSockets();

                // Extract more detailed user info from socket data
                connectedUsers = sockets.map(socket => {
                    // Get user data from socket.data (populated during authentication)
                    // @ts-ignore - socket.data might not be in the type definitions
                    const userData = socket.data || {};
                    const userId = userData.userId || socket.id;
                    const userName = userData.name || 'Anonymous';

                    // If we can fetch the socket via fetchSockets(), it's connected
                    const isConnected = true;

                    return {
                        id: userId,
                        name: userName,
                        socketId: socket.id,
                        isConnected
                    };
                });
            } catch (err) {
                console.error('Error fetching socket information:', err);
            }
        }

        // Return status information
        const response: SocketAPIResponse = {
            success: true,
            message: isSocketServerRunning
                ? `Socket.IO server is running with ${clientsCount} clients connected`
                : "Socket.IO server status unknown. Make sure the custom server (server.js) is running",
            connectedUsers: isSocketServerRunning ? connectedUsers : [],
            serverInfo: {
                port: process.env.PORT ? parseInt(process.env.PORT) : 4000,
                path: '/socket.io'
            }
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("Socket.IO API route error:", error);
        const errorResponse: SocketActionResponse = {
            success: false,
            message: "Failed to check Socket.IO server status"
        };
        return NextResponse.json(errorResponse, { status: 500 });
    }
}

// Response type for POST method
interface SocketActionResponse {
    success: boolean;
    message: string;
}

// This endpoint can be used to force a reconnection of all sockets
export async function POST(req: Request) {
    try {
        if (!global.socketIOServer) {
            const response: SocketActionResponse = {
                success: false,
                message: "Socket.IO server not initialized. Make sure server.js is running."
            };
            return NextResponse.json(response, { status: 400 });
        }

        // Get all sockets
        const sockets = await global.socketIOServer.fetchSockets();

        // Count before disconnection
        const countBefore = sockets.length;

        // Disconnect all sockets to force reconnection
        for (const socket of sockets) {
            socket.disconnect(true);
        }

        const response: SocketActionResponse = {
            success: true,
            message: `Disconnected ${countBefore} sockets. They should attempt to reconnect automatically.`
        };
        return NextResponse.json(response);
    } catch (error) {
        console.error("Error in Socket.IO force reconnect:", error);
        const errorResponse: SocketActionResponse = {
            success: false,
            message: "Failed to force socket reconnections"
        };
        return NextResponse.json(errorResponse, { status: 500 });
    }
}
