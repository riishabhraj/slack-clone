// Simple CommonJS version of server
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Socket.io setup
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = dev ? 'localhost' : '0.0.0.0';
const port = process.env.PORT || 4000;  // Consistently use port 4000 for the socket server

// Create a logger that can be silenced in production or via env var
const enableSocketLogs = dev && process.env.ENABLE_SOCKET_LOGS !== 'false';
const logger = {
    log: (...args) => {
        if (enableSocketLogs) console.log(...args);
    },
    error: (...args) => console.error(...args) // Always show errors
};

// prepare next app
const app = next({ dev, hostname, port: dev ? 3000 : port });  // Use port 3000 for Next.js in dev, but same port in production
const handle = app.getRequestHandler();

app.prepare().then(() => {
    // Create HTTP server
    const server = createServer((req, res) => {
        // Skip Socket.IO requests for Next.js handling
        if (req.url?.startsWith('/socket.io')) {
            res.statusCode = 501;
            res.end('Not Implemented - Socket.IO request');
            return;
        }

        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });

    // Initialize Socket.IO
    const io = new Server(server, {
        path: '/socket.io',
        cors: {
            // In production, accept connections from any origin
            // In development, limit to localhost:3000
            origin: dev ? ['http://localhost:3000'] : '*',
            methods: ['GET', 'POST', 'OPTIONS'],
            credentials: true,
            allowedHeaders: ['Content-Type', 'Authorization']
        },
        // Add this configuration for better compatibility and stability
        allowEIO3: true,
        transports: ['polling', 'websocket'], // Start with polling for better compatibility
        pingTimeout: 60000, // Longer timeout for unstable connections
        pingInterval: 25000 // More frequent pings to detect disconnection
    });

    // Store connected users
    const connectedUsers = new Map();

    // Socket.IO events
    io.on('connection', (socket) => {
        // Log connection only when needed
        logger.log(`Socket connected: ${socket.id}`);

        // Log socket handshake details in debug mode to help diagnose issues
        if (process.env.DEBUG_SOCKETS === 'true') {
            logger.log('Socket handshake:', {
                headers: socket.handshake.headers,
                address: socket.handshake.address,
                secure: socket.request.secure,
                protocol: socket.request.headers['x-forwarded-proto'] || 'http'
            });
        }

        // Set up socket authentication
        socket.on('authenticate', (authData) => {
            if (!authData || !authData.userId) {
                socket.emit('unauthorized', { message: 'Authentication failed: Missing user ID' });
                logger.error(`Authentication failed for socket ${socket.id} - missing user ID`);
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
            // Only log authentication in verbose mode
            logger.log(`Socket ${socket.id} authenticated as user ${socket.data.userId}`);
        });

        // Handle joining channel
        socket.on('joinChannel', (channelId) => {
            const roomName = `channel:${channelId}`;
            socket.join(roomName);
            logger.log(`Socket ${socket.id} (${socket.data?.name || 'Anonymous'}) joined channel ${channelId}`);
        });

        // Handle leaving channel
        socket.on('leaveChannel', (channelId) => {
            const roomName = `channel:${channelId}`;
            socket.leave(roomName);
            logger.log(`Socket ${socket.id} (${socket.data?.name || 'Anonymous'}) left channel ${channelId}`);
        });

        // Handle sending messages
        socket.on('sendMessage', async ({ channelId, content }) => {
            try {
                if (!socket.data?.userId) {
                    logger.error(`Unauthenticated socket ${socket.id} attempted to send message`);
                    return;
                }

                // Only log message activity in verbose mode
                logger.log(`Message in channel ${channelId}: ${content.substring(0, 20)}${content.length > 20 ? '...' : ''}`);

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
                logger.error('Error processing socket message:', error);
            }
        });

        // Rest of event handlers - no verbose logs for typing indicators
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

        // Rest of call handling events - minimal logging
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

        // Handle heartbeat (no logging)
        socket.on('heartbeat', ({ timestamp }) => {
            socket.emit('heartbeatAck', { timestamp, serverTime: Date.now() });
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            logger.log(`Socket disconnected: ${socket.id}`);
            if (socket.data?.userId) {
                // Only remove from connectedUsers if this socket ID matches the stored one
                if (connectedUsers.get(socket.data.userId) === socket.id) {
                    connectedUsers.delete(socket.data.userId);
                }
            }
        });
    });

    // Store Socket.IO instance globally for API routes to access
    global.socketIOServer = io;

    // Start server with error handling
    server.listen(port, hostname, (err) => {
        if (err) {
            console.error('Failed to start server:', err);
            return;
        }
        console.log(`> Server ready on http://${hostname}:${port}`);
        console.log(`> Next.js app running on http://${hostname}:${dev ? 3000 : port}`);
        console.log(`> Socket.IO server initialized on path /socket.io`);
    });
}).catch((err) => {
    console.error('Error preparing Next.js app:', err);
    process.exit(1);
});
