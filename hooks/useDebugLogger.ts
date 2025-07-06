'use client';

import { useSession } from 'next-auth/react';

export function useDebugLogger() {
    const { data: session } = useSession();
    const userId = session?.user?.id || 'unknown';

    const logEvent = async (event: string, data?: any) => {
        // In production, only log to console if needed, skip API calls
        if (process.env.NODE_ENV === 'production') {
            // Optionally keep minimal console logs for critical events
            // console.log(`[PROD] ${event}`, data);
            return;
        }

        try {
            // Only send logs to API in development
            if (process.env.NODE_ENV === 'development') {
                try {
                    await fetch('/api/debug/log', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            event,
                            data,
                            userId
                        }),
                    });
                } catch (e) {
                    // Silently fail API calls
                }
            }

            // Still log to console in development
            console.log(`[CLIENT DEBUG] ${event}`, data);
        } catch (error) {
            // Suppress errors in production
            if (process.env.NODE_ENV === 'development') {
                console.error('Failed to log debug event:', error);
            }
        }
    };

    return { logEvent };
}
