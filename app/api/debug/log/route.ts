import { NextResponse } from 'next/server';

// Empty handler for debug logs that prevents 404 errors in production
export async function POST() {
    return NextResponse.json({ success: true });
}

export async function GET() {
    return NextResponse.json({ success: true });
}
