// Simple CommonJS version of server
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Socket.io setup
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = dev ? 'localhost' : '0.0.0.0';
const port = process.env.PORT || (dev ? 3001 : 3000);

// prepare next app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    // Create HTTP server
    const server = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });

    // Initialize Socket.IO
    const io = new Server(server, {
        path: '/api/socket/io',
        cors: {
            origin: dev ? ['http://localhost:3000'] : true, // Allow any origin in production
            methods: ['GET', 'POST'],
            credentials: true
        },
        // Add this configuration for production
        allowEIO3: true,
        transports: ['polling', 'websocket']
    });    // Socket.IO events
    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // Extract user info from session (would need middleware in production)
        socket.data = {
            userId: socket.handshake.auth.userId || 'unknown',
            name: socket.handshake.auth.name || null,
            image: socket.handshake.auth.image || null
        };

        // Handle joining channel
        socket.on('joinChannel', (channelId) => {
            const roomName = `channel:${channelId}`;
            socket.join(roomName);
            console.log(`Socket ${socket.id} (${socket.data.name || socket.data.userId}) joined channel ${channelId}`);
        });

        // Handle leaving channel
        socket.on('leaveChannel', (channelId) => {
            const roomName = `channel:${channelId}`;
            socket.leave(roomName);
            console.log(`Socket ${socket.id} (${socket.data.name || socket.data.userId}) left channel ${channelId}`);
        });

        // Handle sending messages
        socket.on('sendMessage', async ({ channelId, content }) => {
            try {
                // In a real implementation, you'd validate and save to DB here
                console.log(`Socket ${socket.id} sending message to channel ${channelId}: ${content.substring(0, 20)}${content.length > 20 ? '...' : ''}`);

                // Create a temporary message object while the API handles persistence
                const tempMessage = {
                    id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    content,
                    channelId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    userId: socket.data.userId,
                    user: {
                        id: socket.data.userId,
                        name: socket.data.name,
                        image: socket.data.image
                    }
                };

                // Broadcast to everyone in the channel except sender
                socket.to(`channel:${channelId}`).emit('newMessage', tempMessage);

                // The API will handle actual persistence and emit another event when complete
            } catch (error) {
                console.error('Error processing socket message:', error);
            }
        });

        // Handle typing indicators
        socket.on('typing', ({ channelId }) => {
            socket.to(`channel:${channelId}`).emit('typing', {
                channelId,
                userId: socket.data.userId || 'unknown',
                userName: socket.data.name || null
            });
        });

        // Handle stop typing
        socket.on('stopTyping', ({ channelId }) => {
            socket.to(`channel:${channelId}`).emit('stopTyping', {
                channelId,
                userId: socket.data.userId || 'unknown'
            });
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });

    // Store Socket.IO instance globally
    global.socketIOServer = io;

    server.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log(`> Socket.IO server initialized`);
    });
});
