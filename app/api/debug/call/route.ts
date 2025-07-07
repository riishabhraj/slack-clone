import { NextResponse } from 'next/server';

// This is a placeholder endpoint for the debug call API
// We need it to avoid 404 errors in production because CallTester.tsx makes requests to it

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        callInfo: {
            activeCallCount: 0,
            activeCalls: [],
            socketConnected: true,
            lastCallEvent: null,
        },
        socketInfo: {
            connected: true,
            connectedUsers: 0,
        },
        message: 'Debug call API is not available in production'
    });
}
