'use client';

/**
 * Empty debug logger - does nothing
 * This is a placeholder to prevent errors in components that import useDebugLogger
 */
export function useDebugLogger() {
    // No-op function that accepts any arguments and returns void
    const logEvent = (_event: string, _data?: any): void => { };
    return { logEvent };
}
