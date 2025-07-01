// Import required modules
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initSocketServer } from './lib/socket';

// Check if running in development mode
const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Prepare app to handle requests
app.prepare().then(() => {
    // Create HTTP server
    const server = createServer((req, res) => {
        // Parse URL
        const parsedUrl = parse(req.url!, true);

        // Pass requests to Next.js handler
        handle(req, res, parsedUrl);
    });

    // Initialize Socket.IO with the HTTP server
    initSocketServer(server);

    // Start the server
    server.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
