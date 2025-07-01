import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';

// Socket.IO event types
export type ServerToClientEvents = {
    newMessage: (data: {
        id: string;
        content: string;
        createdAt: string;
        updatedAt: string;
        userId: string;
        channelId: string;
        user: {
            id: string;
            name: string | null;
            image: string | null;
        };
    }) => void;
    messageDeleted: (data: { id: string; channelId: string }) => void;
    channelUpdated: (data: {
        id: string;
        name: string;
        description: string | null;
        isPrivate: boolean;
        updatedAt: string;
    }) => void;
    typing: (data: { channelId: string; userId: string; userName: string | null }) => void;
    stopTyping: (data: { channelId: string; userId: string }) => void;

    // Call signaling events
    callOffer: (data: {
        from: string;
        to: string;
        channelId: string;
        signal: any;
        callType: 'audio' | 'video';
        caller: {
            id: string;
            name: string | null;
            image: string | null;
        };
    }) => void;
    callAnswer: (data: { from: string; to: string; signal: any }) => void;
    callRejected: (data: { from: string; to: string; reason?: string }) => void;
    callEnded: (data: { from: string; to: string; reason?: string }) => void;
    userBusy: (data: { from: string; to: string; reason?: string }) => void;
    iceCandidate: (data: { from: string; to: string; candidate: any }) => void;
};

export type ClientToServerEvents = {
    joinChannel: (channelId: string) => void;
    leaveChannel: (channelId: string) => void;
    sendMessage: (data: {
        content: string;
        channelId: string;
    }) => void;
    typing: (data: { channelId: string }) => void;
    stopTyping: (data: { channelId: string }) => void;
    authenticate: (data: { userId: string; name: string | null; image: string | null }) => void;

    // Call signaling events
    callUser: (data: {
        to: string;
        channelId: string;
        signal: any;
        callType: 'audio' | 'video'
    }) => void;
    answerCall: (data: { to: string; signal: any }) => void;
    rejectCall: (data: { to: string; reason?: string }) => void;
    endCall: (data: { to: string; reason?: string }) => void;
    sendIceCandidate: (data: { to: string; candidate: any }) => void;
};

export type SocketData = {
    userId: string;
    name: string | null;
    image: string | null;
};

// Global instance for the Socket.IO server
let io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

export const initSocketServer = (httpServer: HttpServer) => {
    if (io) {
        console.log('Socket server already initialized');
        return io;
    }

    io = new Server(httpServer, {
        path: '/api/socket/io',
        cors: {
            origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000'],
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    // Store active user connections
    const connectedUsers = new Map<string, string>();

    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // Store the user in connected users map
        const userId = socket.handshake.auth.userId;
        if (userId) {
            console.log(`User ${userId} connected with socket ${socket.id}`);
            connectedUsers.set(userId, socket.id);

            // Print all currently connected users
            console.log('Connected users:', Array.from(connectedUsers.entries()));
        } else {
            console.warn('Socket connected without user ID in auth data');
        }

        // Handle re-authentication events (after reconnect)
        socket.on('authenticate', (data) => {
            if (data.userId) {
                console.log(`User ${data.userId} re-authenticated with socket ${socket.id}`);
                connectedUsers.set(data.userId, socket.id);
                console.log('Connected users after re-auth:', Array.from(connectedUsers.entries()));
            }
        });

        // Handle joining a channel
        socket.on('joinChannel', (channelId: string) => {
            socket.join(`channel:${channelId}`);
            console.log(`Socket ${socket.id} (user ${userId}) joined channel ${channelId}`);
        });

        // Handle leaving a channel
        socket.on('leaveChannel', (channelId: string) => {
            socket.leave(`channel:${channelId}`);
            console.log(`Socket ${socket.id} left channel ${channelId}`);
        });

        // Call signaling handlers
        socket.on('callUser', (data) => {
            console.log(`Call request from ${userId} to ${data.to} in channel ${data.channelId}`);

            const receiverSocketId = connectedUsers.get(data.to);
            console.log(`Receiver socket ID for user ${data.to}:`, receiverSocketId);

            if (receiverSocketId) {
                console.log(`Emitting callOffer to socket ${receiverSocketId}`);
                io?.to(receiverSocketId).emit('callOffer', {
                    from: userId,
                    to: data.to,
                    channelId: data.channelId,
                    signal: data.signal,
                    callType: data.callType,
                    caller: {
                        id: userId,
                        name: socket.handshake.auth.name,
                        image: socket.handshake.auth.image
                    }
                });
            } else {
                console.warn(`User ${data.to} not connected, cannot send call offer`);
            }
        });

        socket.on('answerCall', (data) => {
            console.log(`Call answer from ${userId} to ${data.to}`);

            const callerSocketId = connectedUsers.get(data.to);
            if (callerSocketId) {
                io?.to(callerSocketId).emit('callAnswer', {
                    from: userId,
                    to: data.to,
                    signal: data.signal
                });
            } else {
                console.warn(`User ${data.to} not connected, cannot send call answer`);
            }
        });

        socket.on('rejectCall', (data) => {
            console.log(`Call rejected by ${userId}`);

            const callerSocketId = connectedUsers.get(data.to);
            if (callerSocketId) {
                io?.to(callerSocketId).emit('callRejected', {
                    from: userId,
                    to: data.to,
                    reason: data.reason
                });
            }
        });

        socket.on('endCall', (data) => {
            console.log(`Call ended by ${userId}`);

            const receiverSocketId = connectedUsers.get(data.to);
            if (receiverSocketId) {
                io?.to(receiverSocketId).emit('callEnded', {
                    from: userId,
                    to: data.to,
                    reason: data.reason
                });
            }
        });

        socket.on('sendIceCandidate', (data) => {
            const receiverSocketId = connectedUsers.get(data.to);
            if (receiverSocketId) {
                io?.to(receiverSocketId).emit('iceCandidate', {
                    from: userId,
                    to: data.to,
                    candidate: data.candidate
                });
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}${userId ? ` (user ${userId})` : ''}`);
            if (userId) {
                // Only remove the user if their current socket matches this one
                // This prevents issues with multiple tabs/reconnections
                if (connectedUsers.get(userId) === socket.id) {
                    connectedUsers.delete(userId);
                    console.log(`User ${userId} removed from connected users`);
                } else {
                    console.log(`User ${userId} has another active connection, not removing from connected users`);
                }
            }
        });
    });

    console.log('Socket.IO server initialized');
    return io;
};

export const getSocketServer = () => {
    if (!io) {
        throw new Error('Socket.IO server not initialized. Call initSocketServer first.');
    }
    return io;
};

// For emitting messages to a specific channel
export const emitNewMessage = (channelId: string, message: any) => {
    if (!io) {
        console.error('Socket.IO server not initialized');
        return;
    }
    io.to(`channel:${channelId}`).emit('newMessage', message);
};

export const emitChannelUpdated = (channelId: string, channel: any) => {
    if (!io) {
        console.error('Socket.IO server not initialized');
        return;
    }
    io.to(`channel:${channelId}`).emit('channelUpdated', channel);
};
