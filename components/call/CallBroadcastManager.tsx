'use client';

import { useSession } from 'next-auth/react';
import { useCallBroadcastListener } from '@/store/useCallStore';

/**
 * CallBroadcastManager
 *
 * This component initializes the broadcast channel listener for call events
 * across different windows of the same user session.
 *
 * It doesn't render any UI, but sets up the event listeners needed for
 * synchronizing call state between different browser windows/tabs.
 */
export function CallBroadcastManager() {
    const { data: session } = useSession();

    // Set up the broadcast listeners
    useCallBroadcastListener(session);

    // This component doesn't render anything
    return null;
}
