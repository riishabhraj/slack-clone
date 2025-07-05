'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useCallStore } from '@/store/useCallStore';
import { useDebugLogger } from '@/hooks/useDebugLogger';

/**
 * CallDebugger
 *
 * A component that adds diagnostic information to the page for debugging call functionality.
 * Can be enabled/disabled with a query parameter or environment variable.
 */
export function CallDebugger() {
    const { data: session } = useSession();
    const { logEvent } = useDebugLogger();
    const {
        status,
        callType,
        channelId,
        caller,
        receiver,
        isAudioMuted,
        isVideoMuted,
    } = useCallStore();

    // Log state changes
    useEffect(() => {
        logEvent('CallDebugger_StateUpdate', {
            status,
            callType,
            channelId,
            caller: caller?.id || null,
            receiver: receiver?.id || null,
            userId: session?.user?.id || null,
            isAudioMuted,
            isVideoMuted,
            timestamp: new Date().toISOString(),
        });
    }, [
        status,
        callType,
        channelId,
        caller,
        receiver,
        session?.user?.id,
        isAudioMuted,
        isVideoMuted,
        logEvent,
    ]);

    // Check if debug mode is enabled (via query param or env var)
    const isDebugMode =
        typeof window !== 'undefined' &&
        (new URLSearchParams(window.location.search).get('debugCalls') === 'true' ||
            process.env.NEXT_PUBLIC_DEBUG_CALLS === 'true');

    if (!isDebugMode) {
        return null;
    }

    return (
        <div className="fixed bottom-0 right-0 bg-black bg-opacity-80 text-white p-4 m-2 rounded-md text-xs z-50 max-w-xs">
            <h4 className="font-bold mb-2">Call Debug Info</h4>
            <div className="space-y-1">
                <p><span className="font-semibold">Status:</span> {status}</p>
                <p><span className="font-semibold">Type:</span> {callType || 'none'}</p>
                <p><span className="font-semibold">Channel:</span> {channelId || 'none'}</p>
                <p><span className="font-semibold">User:</span> {session?.user?.name || 'not signed in'}</p>
                <p><span className="font-semibold">Caller:</span> {caller?.name || 'none'}</p>
                <p><span className="font-semibold">Receiver:</span> {receiver?.name || 'none'}</p>
                <p><span className="font-semibold">Audio:</span> {isAudioMuted ? 'Muted' : 'On'}</p>
                <p><span className="font-semibold">Video:</span> {isVideoMuted ? 'Off' : 'On'}</p>
                <p className="text-xs opacity-70 mt-2">Window ID: {Math.random().toString(36).substring(2, 8)}</p>
            </div>
        </div>
    );
}
