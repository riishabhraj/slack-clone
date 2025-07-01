import { NextResponse } from 'next/server';

// Debug endpoint for checking socket connections and active call state
export async function GET(req: Request) {
    try {
        if (!global.socketIOServer) {
            return NextResponse.json({
                success: false,
                message: "Socket.IO server not initialized"
            }, { status: 400 });
        }

        // Get all sockets
        const sockets = await global.socketIOServer.fetchSockets();

        // Extract user and room information
        const activeUsers = sockets.map(socket => ({
            socketId: socket.id,
            userId: socket.handshake?.auth?.userId || 'unknown',
            userName: socket.handshake?.auth?.name || 'unknown',
            userImage: socket.handshake?.auth?.image || null,
            rooms: Array.from(socket.rooms || []).filter(room => !room.startsWith('socket:')),
            activeChannels: Array.from(socket.rooms || [])
                .filter(room => room.startsWith('channel:'))
                .map(room => room.replace('channel:', ''))
        }));

        // Get unique users
        const userMap = new Map();
        activeUsers.forEach(user => {
            if (user.userId !== 'unknown') {
                userMap.set(user.userId, user);
            }
        });

        // Usernames to socket mapping
        const userSocketMap = new Map();
        activeUsers.forEach(user => {
            if (user.userId !== 'unknown') {
                userSocketMap.set(user.userId, user.socketId);
            }
        });

        return NextResponse.json({
            success: true,
            connections: {
                totalSockets: sockets.length,
                uniqueUsers: Array.from(userMap.values()),
                userToSocketMap: Object.fromEntries(userSocketMap),
            },
            activeUsers
        });
    } catch (error) {
        console.error("Error in Socket.IO debug endpoint:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch socket debug information" },
            { status: 500 }
        );
    }
}
