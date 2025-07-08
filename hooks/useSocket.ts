'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { ClientToServerEvents, ServerToClientEvents } from '@/lib/socket';

// Socket.IO client includes additional events not in our type definitions
// We'll use the any type for the socket instance to avoid TypeScript errors with reconnection events
let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10; // Increased maximum reconnection attempts
const RECONNECT_DELAY_MS = 1500; // Reduced delay for faster recovery
const CONNECTION_TIMEOUT_MS = 15000; // Increased timeout for slower connections

export function useSocket() {
    const { data: session, status } = useSession();
    const [isConnected, setIsConnected] = useState(false);

    // Create a heartbeat to detect disconnections that the socket library doesn't catch
    useEffect(() => {
        if (!isConnected || !socket) return;

        // Set up heartbeat to keep connection alive
        const heartbeatInterval = setInterval(() => {
            if (socket && socket.connected) {
                socket.emit('heartbeat', { timestamp: Date.now() });
            }
        }, 30000); // Check every 30 seconds

        return () => clearInterval(heartbeatInterval);
    }, [isConnected]);

    // Connection manager function
    const ensureSocketConnection = useCallback(() => {
        if (status !== 'authenticated' || !session?.user?.id) {
            return false;
        }

        if (socket && socket.connected) {
            return true;
        }

        try {
            // Create auth data
            const authData = {
                userId: session.user.id,
                name: session.user.name,
                image: session.user.image
            };

            // Force disconnect if socket exists but isn't connected
            if (socket && !socket.connected) {
                socket.disconnect();
                socket = null;
            }

            // Create new socket
            // In development, force use of http not ws protocol to avoid certificate issues
            const socketUrl = process.env.NODE_ENV === 'development'
                ? 'http://localhost:4000'  // Hard-code to HTTP in development
                : (process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin);

            socket = io(socketUrl, {
                withCredentials: true,
                path: '/socket.io', // Always use /socket.io path for consistency
                reconnection: true,
                reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
                reconnectionDelay: RECONNECT_DELAY_MS,
                timeout: CONNECTION_TIMEOUT_MS,
                transports: ['websocket', 'polling'], // Try WebSocket first, then fall back to polling
                auth: authData
            });

            // Set up event listeners
            setupSocketListeners(authData);

            return true;
        } catch (error) {
            return false;
        }
    }, [status, session]);

    // Setup function for socket event listeners
    const setupSocketListeners = useCallback((authData: any) => {
        if (!socket) return;

        // Set up event listeners
        socket.on('connect', () => {
            setIsConnected(true);
            reconnectAttempts = 0; // Reset reconnect attempts on successful connection

            // Send authentication data
            socket?.emit('authenticate', authData);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        socket.on('connect_error', () => {
            setIsConnected(false);

            // Manual reconnect logic if needed
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                setTimeout(() => {
                    socket?.connect();
                }, RECONNECT_DELAY_MS);
            }
        });

        // @ts-ignore - reconnect event is part of socket.io-client but not in our type definitions
        socket.on('reconnect', () => {
            setIsConnected(true);

            // Re-send authentication data on reconnect
            socket?.emit('authenticate', authData);
        });
    }, []);

    useEffect(() => {
        // Only initialize socket when session is authenticated
        if (status !== 'authenticated') {
            return;
        }

        // Create auth data
        const authData = {
            userId: session?.user?.id,
            name: session?.user?.name,
            image: session?.user?.image
        };

        // Initialize socket if it doesn't exist or if it's not connected
        if (!socket) {
            ensureSocketConnection();
        } else if (!socket.connected) {
            socket.connect();
        }

        // Set up event listeners
        setupSocketListeners(authData);

        // Clean up function just removes listeners, doesn't disconnect
        return () => {
            // We don't disconnect or destroy the socket, just clean up listeners specific to this hook instance
        };
    }, [status, session, setupSocketListeners, ensureSocketConnection]);

    // Force reconnect function that can be called if needed
    const forceReconnect = () => {
        if (socket) {
            socket.disconnect();

            // Small timeout to ensure disconnect is processed
            setTimeout(() => {
                socket?.connect();
            }, 500);
        }
    };

    // Function to join a channel
    const joinChannel = (channelId: string) => {
        if (socket && isConnected) {
            socket.emit('joinChannel', channelId);
        }
    };

    // Function to leave a channel
    const leaveChannel = (channelId: string) => {
        if (socket && isConnected) {
            socket.emit('leaveChannel', channelId);
        }
    };

    // Function to send a message via socket
    const emitMessage = (channelId: string, content: string) => {
        if (socket && isConnected) {
            socket.emit('sendMessage', { channelId, content });
            return true;
        }
        return false;
    };

    // Function to send a typing indicator
    const sendTyping = (channelId: string) => {
        if (socket && isConnected) {
            socket.emit('typing', { channelId });
        }
    };

    // Function to send a stop typing indicator
    const sendStopTyping = (channelId: string) => {
        if (socket && isConnected) {
            socket.emit('stopTyping', { channelId });
        }
    };

    // Function to call another user
    const callUser = (to: string, channelId: string, signal: any, callType: 'audio' | 'video') => {
        if (!ensureSocketConnection()) {
            return false;
        }

        if (socket && isConnected) {
            socket.emit('callUser', { to, channelId, signal, callType });
            return true;
        } else {
            return false;
        }
    };

    // Function to answer a call
    const answerCall = (to: string, signal: any) => {
        if (!ensureSocketConnection()) {
            return false;
        }

        if (socket && isConnected) {
            socket.emit('answerCall', { to, signal });
            return true;
        }
        return false;
    };

    // Function to reject a call
    const rejectCall = (to: string, reason?: string) => {
        ensureSocketConnection();

        if (socket && isConnected) {
            socket.emit('rejectCall', { to, reason });
        }
    };

    // Function to end a call
    const endCall = (to: string, reason?: string) => {
        ensureSocketConnection();

        if (socket && isConnected) {
            socket.emit('endCall', { to, reason });
        }
    };

    // Function to send ICE candidate
    const sendIceCandidate = (to: string, candidate: any) => {
        ensureSocketConnection();

        if (socket && isConnected) {
            socket.emit('sendIceCandidate', { to, candidate });
        }
    };

    return {
        socket: socket as Socket<ServerToClientEvents, ClientToServerEvents> | null,
        isConnected,
        forceReconnect,
        joinChannel,
        leaveChannel,
        emitMessage,
        sendTyping,
        sendStopTyping,
        callUser,
        answerCall,
        rejectCall,
        endCall,
        sendIceCandidate,
        ensureSocketConnection // Expose the ensureSocketConnection function
    };
}
