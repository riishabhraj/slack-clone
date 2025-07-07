'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useCallStore } from '@/store/useCallStore';
import { useSocket } from '@/hooks/useSocket';

// This component is only for development testing and is completely disabled in production
// Return empty component in production to avoid any API calls or rendering
export function CallTester() {
    // Early return for production - never render anything
    if (process.env.NODE_ENV === 'production') {
        return null;
    }

    // The rest of this component will only run in development
    const { data: session } = useSession();
    const userId = session?.user?.id;
    const [users, setUsers] = useState<Array<{ id: string, name: string }>>([]);
    const [loading, setLoading] = useState(false);
    const [debugInfo, setDebugInfo] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const { isConnected: socketConnected } = useSocket();

    const {
        status: callStatus,
        startCall
    } = useCallStore();

    // Fetch available users to call
    useEffect(() => {
        if (!userId) return;

        const fetchUsers = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/users');
                const data = await response.json();

                if (response.ok) {
                    // Filter out current user
                    const otherUsers = data.users.filter((user: any) => user.id !== userId);
                    setUsers(otherUsers);
                } else {
                    setError('Failed to fetch users');
                }
            } catch (err) {
                setError('An error occurred while fetching users');
                if (process.env.NODE_ENV !== 'production') {
                    console.error(err);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [userId]);    // Debug info is disabled - using static mock data instead
    useEffect(() => {
        if (!userId) return;

        // Use mock data instead of fetching
        setDebugInfo({
            status: 'ok',
            callInfo: {
                activeCallCount: 0,
                activeCalls: [],
                socketConnected: true,
                lastCallEvent: null,
            },
            socketInfo: {
                connected: true,
                connectedUsers: 0,
            },
            message: 'Debug call API is disabled'
        });

    }, [userId]);

    // Initiate a call to the selected user
    const handleStartCall = async (recipientId: string, recipientName: string, callType: 'audio' | 'video') => {
        try {
            // Find recipient details
            const recipient = users.find(user => user.id === recipientId);
            if (!recipient) {
                setError('Selected user not found');
                return;
            }

            // Start call using useCallStore
            await startCall(
                callType,
                `direct-${userId}-${recipientId}`, // Channel ID for direct message
                {
                    id: recipientId,
                    name: recipientName,
                    image: null
                }
            );
        } catch (err) {
            setError('Failed to start call');
            if (process.env.NODE_ENV !== 'production') {
                console.error(err);
            }
        }
    };

    // Check if testing mode is enabled - only allow in development
    const isTestMode =
        process.env.NODE_ENV === 'development' &&
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('testCalls') === 'true';

    if (!isTestMode || !userId) {
        return null;
    }

    return (
        <div className="fixed top-16 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 w-80 z-50 border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold mb-2 flex items-center justify-between">
                <span>Call Testing Tool</span>
                <span className={`h-2 w-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </h3>

            {error && (
                <div className="bg-red-100 dark:bg-red-900 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-2 mb-3 text-sm">
                    {error}
                </div>
            )}

            <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current call status: <strong>{callStatus}</strong></p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Socket: {socketConnected ? 'Connected' : 'Disconnected'}</p>
            </div>

            <div className="mb-4">
                <h4 className="font-semibold text-sm mb-2">Available Users</h4>
                {loading ? (
                    <p className="text-sm text-gray-500">Loading users...</p>
                ) : users.length === 0 ? (
                    <p className="text-sm text-gray-500">No other users available</p>
                ) : (
                    <ul className="space-y-2 max-h-40 overflow-y-auto">
                        {users.map(user => (
                            <li key={user.id} className="text-sm p-2 bg-gray-100 dark:bg-gray-700 rounded">
                                <p className="font-medium">{user.name}</p>
                                <div className="mt-1 flex space-x-2">
                                    <button
                                        onClick={() => handleStartCall(user.id, user.name, 'audio')}
                                        className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                                        disabled={callStatus !== 'idle'}
                                    >
                                        Audio Call
                                    </button>
                                    <button
                                        onClick={() => handleStartCall(user.id, user.name, 'video')}
                                        className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                                        disabled={callStatus !== 'idle'}
                                    >
                                        Video Call
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 border-t pt-2">
                <p>Window ID: {Math.random().toString(36).substring(2, 8)}</p>
                <p className="opacity-60 text-[10px] mt-1">Add ?testCalls=true to URL to show this panel</p>
            </div>
        </div>
    );
}
