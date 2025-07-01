'use client';

import { useSession } from 'next-auth/react';

export function useDebugLogger() {
    const { data: session } = useSession();
    const userId = session?.user?.id || 'unknown';

    const logEvent = async (event: string, data?: any) => {
        try {
            // Send log to API endpoint
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

            // Also log to console for client-side visibility
            console.log(`[CLIENT DEBUG] ${event}`, data);
        } catch (error) {
            console.error('Failed to log debug event:', error);
        }
    };

    return { logEvent };
}
