import { NextResponse } from 'next/server';

// Disable all debug endpoints in production
export function middleware() {
    // In production, return 404 for any debug-related routes
    if (process.env.NODE_ENV === 'production') {
        return new Response(null, { status: 404 });
    }

    // In development, allow the request to proceed
    return NextResponse.next();
}

export const config = {
    matcher: [
        '/api/debug/:path*',
    ],
};
