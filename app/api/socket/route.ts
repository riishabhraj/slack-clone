import { Server as SocketIOServer } from 'socket.io';
import { NextResponse } from 'next/server';
import type { RemoteSocket } from 'socket.io';

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

// Socket.IO API handler - This just reports status, doesn't actually initialize socket server
// The real Socket.IO initialization happens in server.ts
export async function GET(req: Request) {
    try {
        // Check if Socket.IO seems to be running based on global variable
        // This doesn't actually initialize it - that happens in server.ts
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

                // Extract more detailed user info from socket handshakes
                connectedUsers = sockets.map(socket => {
                    const userId = socket.handshake?.auth?.userId || socket.id;
                    const userName = socket.handshake?.auth?.name || 'Anonymous';

                    // RemoteSocket doesn't have a 'connected' property
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

        // Define response type with proper structure
        interface SocketAPIResponse {
            success: boolean;
            message: string;
            connectedUsers: ConnectedUser[];
        }

        // Return status information
        const response: SocketAPIResponse = {
            success: true,
            message: isSocketServerRunning
                ? `Socket.IO server is running with ${clientsCount} clients connected`
                : "Socket.IO server status unknown. Make sure you're using the custom server (server.ts)",
            connectedUsers: isSocketServerRunning ? connectedUsers : []
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
                message: "Socket.IO server not initialized"
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
