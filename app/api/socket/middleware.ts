import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware ensures socket.io requests are properly handled
export function middleware(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);

    // For socket.io specific paths, make sure CORS headers are set
    if (request.nextUrl.pathname.startsWith('/api/socket/io')) {
        // Add CORS headers for socket.io requests
        const response = NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });

        // Allow credentials
        response.headers.set('Access-Control-Allow-Credentials', 'true');

        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
        }

        // Allow all origins in production or specific ones in development
        if (process.env.NODE_ENV === 'production') {
            response.headers.set('Access-Control-Allow-Origin', '*');
        } else {
            response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
        }

        return response;
    }

    return NextResponse.next();
}

// Apply this middleware only to socket.io routes
export const config = {
    matcher: '/api/socket/:path*',
};
