import { NextRequest } from 'next/server';
import { Server as IOServer } from 'socket.io';
import { Server as NetServer } from 'http';
import { NextApiResponse } from 'next';

// Global instance to keep the IO server alive across requests
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Global object to store Socket.IO server instance
let io: IOServer | undefined;
let httpServer: NetServer | undefined;

export async function GET(req: NextRequest) {
    const res = new Response();

    // Socket.io server needs raw HTTP for WebSocket upgrade
    if (!io) {
        // For Vercel serverless functions, we can't directly access the HTTP server
        // Instead, return instructions on how to use the custom server.js
        return new Response(
            JSON.stringify({
                error: 'Socket.IO server not initialized directly in API route.',
                message: 'This endpoint is a placeholder. For production, use the server.js which implements Socket.IO directly.'
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    }

    // If somehow we have an io instance (shouldn't happen in production serverless)
    return new Response(
        JSON.stringify({ status: 'Socket.IO API route active' }),
        {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );
}

// This doesn't work in serverless but acts as a clear signal
export async function POST(req: NextRequest) {
    return new Response(
        JSON.stringify({
            message: 'Socket.IO POST requests should be handled by the custom server.js'
        }),
        {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );
}
