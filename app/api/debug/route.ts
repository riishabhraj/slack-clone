import { NextResponse } from 'next/server';

// This is a catch-all handler for debug-related API calls that may still be being made
// It prevents 404/405 errors in the console by providing empty success responses
export async function GET() {
    return NextResponse.json({ success: true, message: "Debug API is not available in production" });
}

export async function POST() {
    return NextResponse.json({ success: true, message: "Debug API is not available in production" });
}

export async function PUT() {
    return NextResponse.json({ success: true, message: "Debug API is not available in production" });
}

export async function DELETE() {
    return NextResponse.json({ success: true, message: "Debug API is not available in production" });
}
