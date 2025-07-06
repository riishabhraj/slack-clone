import { NextResponse } from 'next/server';

// Socket.IO route to handle socket connections in production
export async function GET(req: Request) {
    return NextResponse.json(
        {
            message: "Socket.IO connection endpoint. This route should be handled by the socket server directly."
        },
        { status: 200 }
    );
}

export async function POST(req: Request) {
    return NextResponse.json(
        {
            message: "Socket.IO connection endpoint. This route should be handled by the socket server directly."
        },
        { status: 200 }
    );
}
