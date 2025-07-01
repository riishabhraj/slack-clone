'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { useSession } from 'next-auth/react';

export default function CallDebugPage() {
    const router = useRouter();
    const [logs, setLogs] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const { socket, isConnected, forceReconnect } = useSocket();
    const { data: session } = useSession();

    // Fetch debug logs
    const fetchLogs = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/debug/log');
            const data = await response.json();

            if (data.success) {
                setLogs(data.logs || []);
            }

            // Also get connected users
            const socketResponse = await fetch('/api/socket');
            const socketData = await socketResponse.json();

            if (socketData.success) {
                setUsers(socketData.connectedUsers || []);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Clear all logs
    const clearLogs = async () => {
        try {
            await fetch('/api/debug/log', {
                method: 'DELETE',
            });
            setLogs([]);
        } catch (error) {
            console.error('Error clearing logs:', error);
        }
    };

    // Force reconnect all server sockets
    const reconnectAllServerSockets = async () => {
        try {
            const response = await fetch('/api/socket', {
                method: 'POST',
            });
            const data = await response.json();
            alert(data.message);

            // Refresh logs after a short delay
            setTimeout(fetchLogs, 2000);
        } catch (error) {
            console.error('Error reconnecting sockets:', error);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchLogs();
    }, []);

    // Auto-refresh
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (autoRefresh) {
            interval = setInterval(fetchLogs, 3000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoRefresh]);

    // Filter logs by user
    const filterLogsByUser = (userId: string) => {
        return logs.filter(log => log.userId === userId);
    };

    // Get current user logs
    const currentUserLogs = session?.user?.id
        ? filterLogsByUser(session.user.id)
        : [];

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Call Debug Console</h1>
                <div className="space-x-2">
                    <button
                        onClick={() => router.push('/')}
                        className="px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded hover:bg-gray-300 dark:hover:bg-gray-700"
                    >
                        Back to App
                    </button>
                    <button
                        onClick={fetchLogs}
                        disabled={isLoading}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                        {isLoading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* Socket Connection Status */}
            <div className="mb-6 p-4 border rounded-md bg-gray-50 dark:bg-gray-800">
                <h2 className="text-lg font-semibold mb-2">Socket Connection Status</h2>
                <div className="flex items-center mb-2">
                    <div className={`w-4 h-4 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                    {socket && <span className="ml-2 text-gray-500 text-sm">ID: {socket.id}</span>}
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={forceReconnect}
                        className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                        Force Reconnect (Client)
                    </button>
                    <button
                        onClick={reconnectAllServerSockets}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        Reconnect All Server Sockets
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Connected Users Section */}
                <div className="col-span-1 border p-4 rounded-md shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Connected Users</h2>
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                            {users.length}
                        </span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {users.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400">No users connected</p>
                        ) : (
                            <ul className="space-y-2">
                                {users.map((user, index) => (
                                    <li
                                        key={index}
                                        className="p-2 border rounded bg-white dark:bg-gray-700"
                                    >
                                        <div className="font-medium">{user.name || 'Unknown'}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            ID: {user.id}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            Socket: {user.socketId || 'Unknown'}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Current User Logs */}
                <div className="col-span-1 border p-4 rounded-md shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">My Events</h2>
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                            {currentUserLogs.length}
                        </span>
                    </div>
                    <div className="flex items-center mb-4 space-x-2">
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`px-3 py-1 rounded ${autoRefresh
                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                        >
                            {autoRefresh ? 'Auto-refresh: ON' : 'Auto-refresh: OFF'}
                        </button>
                        <button
                            onClick={clearLogs}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                            Clear All Logs
                        </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {currentUserLogs.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400">No events yet</p>
                        ) : (
                            <ul className="space-y-2">
                                {currentUserLogs.map((log, index) => (
                                    <li
                                        key={index}
                                        className="p-2 border rounded bg-white dark:bg-gray-700"
                                    >
                                        <div className="font-medium">{log.event}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </div>
                                        {log.data && Object.keys(log.data).length > 0 && (
                                            <pre className="mt-1 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 p-1 rounded overflow-x-auto">
                                                {JSON.stringify(log.data, null, 2)}
                                            </pre>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* All Logs */}
                <div className="col-span-1 border p-4 rounded-md shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">All Events</h2>
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                            {logs.length}
                        </span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {logs.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400">No events yet</p>
                        ) : (
                            <ul className="space-y-2">
                                {logs.map((log, index) => (
                                    <li
                                        key={index}
                                        className="p-2 border rounded bg-white dark:bg-gray-700"
                                    >
                                        <div className="flex justify-between">
                                            <div className="font-medium">{log.event}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {log.userId?.substring(0, 8)}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </div>
                                        {log.data && Object.keys(log.data).length > 0 && (
                                            <pre className="mt-1 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 p-1 rounded overflow-x-auto">
                                                {JSON.stringify(log.data, null, 2)}
                                            </pre>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
