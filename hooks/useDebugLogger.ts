'use client';

/**
 * Debug logger hook - logs to console in development, no-op in production
 * Uses a local storage mechanism to avoid API calls
 */
export function useDebugLogger() {
    const logEvent = async (event: string, data?: any) => {
        // Only log in development mode
        if (process.env.NODE_ENV !== 'production') {
            // Log to console for development visibility
            console.log(`[DEBUG] ${event}`, data);

            try {
                // Store in local storage for persistence
                const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
                logs.push({
                    timestamp: new Date().toISOString(),
                    event,
                    data
                });
                // Keep only last 100 logs
                if (logs.length > 100) logs.splice(0, logs.length - 100);
                localStorage.setItem('debug_logs', JSON.stringify(logs));
            } catch (e) {
                // Ignore storage errors
            }
        }
    };

    return { logEvent };
}
