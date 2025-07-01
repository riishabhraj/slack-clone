import { NextResponse } from 'next/server';

// Array to store debug logs in memory (for development purposes only)
let debugLogs: any[] = [];

export async function GET(req: Request) {
    try {
        // Return all logs
        return NextResponse.json({
            success: true,
            logs: debugLogs
        });
    } catch (error) {
        console.error("Debug log API error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to retrieve debug logs" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { event, data, userId } = body;

        if (!event) {
            return NextResponse.json({
                success: false,
                message: "Missing required field: event"
            }, { status: 400 });
        }

        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            data: data || {},
            userId: userId || 'unknown',
        };

        // Add log to array (limited to 1000 entries)
        debugLogs.unshift(logEntry);
        if (debugLogs.length > 1000) {
            debugLogs = debugLogs.slice(0, 1000);
        }

        // Also log to console for server-side visibility
        console.log(`[DEBUG LOG] ${logEntry.timestamp} - ${event}`, JSON.stringify(data));

        return NextResponse.json({
            success: true,
            message: "Log entry added"
        });
    } catch (error) {
        console.error("Debug log API error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to add debug log" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        // Clear all logs
        debugLogs = [];

        return NextResponse.json({
            success: true,
            message: "All logs cleared"
        });
    } catch (error) {
        console.error("Debug log API error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to clear debug logs" },
            { status: 500 }
        );
    }
}
