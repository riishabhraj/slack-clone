'use client';

import { useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useDebugLogger } from '@/hooks/useDebugLogger';
import { useSession } from 'next-auth/react';

/**
 * CallSocket
 *
 * This component ensures that a socket connection is established and maintained
 * while the user is actively using the application, especially before making calls.
 *
 * It pre-emptively connects to the socket server and keeps the connection alive.
 */
export function CallSocket() {
    const { data: session } = useSession();
    const { isConnected, ensureSocketConnection } = useSocket();
    const { logEvent } = useDebugLogger();

    // Ensure socket connection when component loads
    useEffect(() => {
        if (session?.user?.id) {
            logEvent('CallSocket_Init', { userId: session.user.id });

            // Try to connect immediately
            ensureSocketConnection();

            // Set up a periodic connection check
            const connectionChecker = setInterval(() => {
                if (!isConnected) {
                    logEvent('CallSocket_Reconnection_Attempt');
                    ensureSocketConnection();
                }
            }, 30000); // Check every 30 seconds

            return () => {
                clearInterval(connectionChecker);
                logEvent('CallSocket_Cleanup');
            };
        }
    }, [session?.user?.id, isConnected, ensureSocketConnection, logEvent]);

    // This component doesn't render anything
    return null;
}
