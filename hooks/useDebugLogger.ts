'use client';

// Empty version of debug logger - all calls to logEvent are no-ops
export function useDebugLogger() {
    // This is a no-op implementation that does nothing
    // All debug endpoints have been completely removed
    const logEvent = async (_event: string, _data?: any) => {
        // Do nothing - all debug functionality has been disabled
        return;
    };

    return { logEvent };
}
