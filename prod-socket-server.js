// Production-specific Socket.IO server
// This file is designed to be deployed to Render.com
require('dotenv').config({ path: '.env.socket.production' }); // Load production env variables

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Get production client URL from environment or use default
const CLIENT_URL = process.env.CLIENT_URL || 'https://slack-clone-b4hu.vercel.app';

console.log(`Starting production socket server with client URL: ${CLIENT_URL}`);

// Enable all CORS requests for the express app
app.use(cors({
    origin: CLIENT_URL,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
}));

// Basic route for health checks
app.get('/', (req, res) => {
    res.send(`Socket.IO server is running. Allowing connection from: ${CLIENT_URL}`);
});

// Initialize Socket.IO
const io = new Server(server, {
    cors: {
        // IMPORTANT: For credentials mode, we can't use wildcard origin
        // We must specify the exact origin
        origin: CLIENT_URL,
        methods: ['GET', 'POST', 'OPTIONS'],
        // CRITICAL FIX: For most Render.com deployments, setting credentials to false fixes CORS issues
        credentials: false
    },
    // For better compatibility
    allowEIO3: true,
    // Use both transports for better compatibility
    transports: ['polling', 'websocket'],
    // Longer timeouts for stability
    pingTimeout: 60000,
    pingInterval: 25000
});

// Store connected users
const connectedUsers = new Map();

// Socket.IO events
io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Set up socket authentication
    socket.on('authenticate', (authData) => {
        if (!authData || !authData.userId) {
            socket.emit('unauthorized', { message: 'Authentication failed: Missing user ID' });
            console.error(`Authentication failed for socket ${socket.id} - missing user ID`);
            return;
        }

        // Store user data on socket
        socket.data = {
            userId: authData.userId,
            name: authData.name || 'Anonymous',
            image: authData.image || null
        };

        // Store in connected users map
        connectedUsers.set(authData.userId, socket.id);

        socket.emit('authenticated');
        console.log(`Socket ${socket.id} authenticated as user ${authData.userId}`);
    });

    // Handle joining channel
    socket.on('joinChannel', (channelId) => {
        const roomName = `channel:${channelId}`;
        socket.join(roomName);
    });

    // Handle leaving channel
    socket.on('leaveChannel', (channelId) => {
        const roomName = `channel:${channelId}`;
        socket.leave(roomName);
    });

    // Handle sending messages
    socket.on('sendMessage', async ({ channelId, content }) => {
        try {
            if (!socket.data?.userId) {
                return;
            }

            // Create a temporary message object
            const tempMessage = {
                id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                content,
                channelId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                userId: socket.data.userId,
                user: {
                    id: socket.data.userId,
                    name: socket.data.name || 'Anonymous',
                    image: socket.data.image
                }
            };

            // Broadcast to everyone in the channel except sender
            socket.to(`channel:${channelId}`).emit('newMessage', tempMessage);
        } catch (error) {
            console.error('Error processing socket message:', error);
        }
    });

    // Handle typing indicators
    socket.on('typing', ({ channelId }) => {
        if (!socket.data?.userId) return;

        socket.to(`channel:${channelId}`).emit('typing', {
            channelId,
            userId: socket.data.userId,
            userName: socket.data.name
        });
    });

    socket.on('stopTyping', ({ channelId }) => {
        if (!socket.data?.userId) return;

        socket.to(`channel:${channelId}`).emit('stopTyping', {
            channelId,
            userId: socket.data.userId
        });
    });

    // Handle call signaling
    socket.on('callUser', (data) => {
        if (!socket.data?.userId) return;

        const receiverSocketId = connectedUsers.get(data.to);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('callOffer', {
                from: socket.data.userId,
                to: data.to,
                channelId: data.channelId,
                signal: data.signal,
                callType: data.callType,
                caller: {
                    id: socket.data.userId,
                    name: socket.data.name,
                    image: socket.data.image
                }
            });
        }
    });

    socket.on('answerCall', (data) => {
        if (!socket.data?.userId) return;

        const callerSocketId = connectedUsers.get(data.to);
        if (callerSocketId) {
            io.to(callerSocketId).emit('callAnswer', {
                from: socket.data.userId,
                to: data.to,
                signal: data.signal
            });
        }
    });

    socket.on('rejectCall', (data) => {
        if (!socket.data?.userId) return;

        const callerSocketId = connectedUsers.get(data.to);
        if (callerSocketId) {
            io.to(callerSocketId).emit('callRejected', {
                from: socket.data.userId,
                to: data.to,
                reason: data.reason
            });
        }
    });

    socket.on('endCall', (data) => {
        if (!socket.data?.userId) return;

        const receiverSocketId = connectedUsers.get(data.to);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('callEnded', {
                from: socket.data.userId,
                to: data.to,
                reason: data.reason
            });
        }
    });

    socket.on('sendIceCandidate', (data) => {
        if (!socket.data?.userId) return;

        const receiverSocketId = connectedUsers.get(data.to);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('iceCandidate', {
                from: socket.data.userId,
                to: data.to,
                candidate: data.candidate
            });
        }
    });

    // Handle heartbeat
    socket.on('heartbeat', ({ timestamp }) => {
        socket.emit('heartbeatAck', { timestamp, serverTime: Date.now() });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        if (socket.data?.userId) {
            // Only remove from connectedUsers if this socket ID matches the stored one
            if (connectedUsers.get(socket.data.userId) === socket.id) {
                connectedUsers.delete(socket.data.userId);
            }
        }
    });
});

// Set port
const PORT = process.env.PORT || 4000;

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Socket.IO server running on port ${PORT}`);
});
