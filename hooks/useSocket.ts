'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { ClientToServerEvents, ServerToClientEvents } from '@/lib/socket';

// Socket.IO client includes additional events not in our type definitions
// We'll use the any type for the socket instance to avoid TypeScript errors with reconnection events
let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 1500;
const CONNECTION_TIMEOUT_MS = 15000;

// Control logging based on environment
const enableLogs = process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_ENABLE_SOCKET_LOGS !== 'false';

// Logger utility to easily control all socket-related logs
const logger = {
    log: (...args: any[]) => {
        if (enableLogs) console.log(...args);
    },
    error: (...args: any[]) => console.error(...args) // Always log errors
};

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
            // Create auth data with all required fields
            const authData = {
                userId: session.user.id,
                name: session.user.name || 'Anonymous',
                image: session.user.image || null
            };

            // Force disconnect if socket exists but isn't connected
            if (socket) {
                socket.disconnect();
                socket = null;
            }

            // Create new socket - Use only the custom server.js implementation
            const socketUrl = process.env.NODE_ENV === 'development'
                ? 'http://localhost:4000'  // Development server on port 4000
                : (process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin);

            // Only log socket URL in development
            logger.log('Connecting to Socket.IO server at:', socketUrl);

            // Get current domain to determine if we're connecting to same origin or cross-origin
            const currentDomain = window.location.origin;
            const isSameOrigin = socketUrl === currentDomain;

            // Only create a new socket if one doesn't exist
            if (!socket) {
                // The key fix for CORS issues:
                // 1. For cross-origin requests in production, we need withCredentials: true
                // 2. For same-origin requests or localhost development, we don't need withCredentials
                const useCredentials = !isSameOrigin && process.env.NODE_ENV === 'production';

                logger.log(`Socket connection mode: ${useCredentials ? 'Cross-origin with credentials' : 'Standard'}`);

                socket = io(socketUrl, {
                    withCredentials: useCredentials,
                    path: '/socket.io',
                    reconnection: true,
                    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
                    reconnectionDelay: RECONNECT_DELAY_MS,
                    timeout: CONNECTION_TIMEOUT_MS,
                    transports: ['polling', 'websocket'], // Start with polling for better compatibility
                    autoConnect: false, // Start with autoConnect off
                    forceNew: true, // Force a new connection each time
                    auth: authData // Include auth data immediately
                });

                // Set up event listeners
                setupSocketListeners(authData);

                // Only connect after setting up listeners
                socket.connect();
            }

            return true;
        } catch (error) {
            logger.error('Socket connection error:', error);
            return false;
        }
    }, [status, session]);

    // Setup function for socket event listeners
    const setupSocketListeners = useCallback((authData: any) => {
        if (!socket) return;

        // Clean up any existing listeners first to prevent duplicates
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('reconnect');
        socket.off('authenticated');
        socket.off('unauthorized');

        // Set up event listeners
        socket.on('connect', () => {
            logger.log('Socket connected:', socket?.id);
            setIsConnected(true);
            reconnectAttempts = 0; // Reset reconnect attempts on successful connection

            // Send authentication data immediately after connecting
            socket?.emit('authenticate', authData);
        });

        socket.on('disconnect', (reason) => {
            logger.log('Socket disconnected:', reason);
            setIsConnected(false);

            // Don't reconnect if the server initiated a disconnect with reason 'io server disconnect'
            if (reason === 'io server disconnect') {
                logger.log('Server initiated disconnect, will not auto-reconnect');
            }
            // No else clause needed - socket.io handles auto-reconnect
        });

        socket.on('connect_error', (err) => {
            // Always log the first error, then only log every 3 attempts to reduce noise
            if (reconnectAttempts === 0 || reconnectAttempts % 3 === 0 || reconnectAttempts === MAX_RECONNECT_ATTEMPTS - 1) {
                logger.error(`Socket connection error (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS}):`, err.message);

                // Log extra diagnostics on first attempt
                if (reconnectAttempts === 0) {
                    // Log additional context for debugging
                    // Log what we can without accessing private properties
                    logger.error('Connection details:', {
                        socketId: socket?.id || 'not connected',
                        connected: socket?.connected || false,
                        // @ts-ignore - accessing some properties that might be useful for debugging
                        transports: socket?.io?.opts?.transports || ['unknown'],
                        withCredentials: socket?.io?.opts?.withCredentials || false
                    });

                    // Check if this is a CORS error
                    if (err.message.includes('CORS') || err.message.includes('cross-origin')) {
                        logger.error('CORS ERROR: Check that your server allows the correct origin and credentials mode');
                    }
                }
            }

            setIsConnected(false);

            // Add fallback to polling if WebSocket fails
            if (err.message.includes('websocket') && socket) {
                logger.log('WebSocket connection failed, falling back to polling');
                // Force to use only polling
                socket.io.opts.transports = ['polling'];
            }

            reconnectAttempts++;
        });

        // @ts-ignore - reconnect event is part of socket.io-client but not in our type definitions
        socket.on('reconnect', (attemptNumber) => {
            logger.log(`Socket reconnected after ${attemptNumber} attempts`);
            setIsConnected(true);

            // Re-send authentication data on reconnect
            socket?.emit('authenticate', authData);
        });

        socket.on('authenticated', () => {
            logger.log('Socket authenticated successfully');
        });

        socket.on('unauthorized', (error) => {
            logger.error('Socket unauthorized:', error);
        });
    }, []);

    useEffect(() => {
        // Only initialize socket when session is authenticated
        if (status !== 'authenticated' || !session?.user?.id) {
            return;
        }

        logger.log('Session authenticated, setting up socket connection');

        // Initialize socket
        ensureSocketConnection();

        // Clean up function - IMPORTANT: We do NOT disconnect the socket here
        // Just remove listeners to avoid memory leaks
        return () => {
            if (socket) {
                socket.off('connect');
                socket.off('disconnect');
                socket.off('connect_error');
                socket.off('reconnect');
                socket.off('authenticated');
                socket.off('unauthorized');
                logger.log('Removed socket event listeners');
            }
        };
    }, [status, session, setupSocketListeners, ensureSocketConnection]);

    // Force reconnect function that can be called if needed
    const forceReconnect = () => {
        if (socket) {
            logger.log('Force reconnecting socket...');
            socket.disconnect();

            // Small timeout to ensure disconnect is processed
            setTimeout(() => {
                if (socket) {
                    socket.connect();
                }
            }, 500);
        } else {
            ensureSocketConnection();
        }
    };

    // Function to join a channel
    const joinChannel = (channelId: string) => {
        if (!isConnected || !socket) {
            if (enableLogs) logger.log('Cannot join channel - socket not connected');
            ensureSocketConnection();
            return false;
        }

        socket.emit('joinChannel', channelId);
        return true;
    };

    // Function to leave a channel
    const leaveChannel = (channelId: string) => {
        if (socket && isConnected) {
            socket.emit('leaveChannel', channelId);
            return true;
        }
        return false;
    };

    // Function to send a message via socket
    const emitMessage = (channelId: string, content: string) => {
        if (!isConnected || !socket) {
            if (enableLogs) logger.log('Cannot send message - socket not connected');
            ensureSocketConnection();
            return false;
        }

        socket.emit('sendMessage', { channelId, content });
        return true;
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
            return true;
        }
        return false;
    };

    // Function to end a call
    const endCall = (to: string, reason?: string) => {
        ensureSocketConnection();

        if (socket && isConnected) {
            socket.emit('endCall', { to, reason });
            return true;
        }
        return false;
    };

    // Function to send ICE candidate
    const sendIceCandidate = (to: string, candidate: any) => {
        ensureSocketConnection();

        if (socket && isConnected) {
            socket.emit('sendIceCandidate', { to, candidate });
            return true;
        }
        return false;
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
        ensureSocketConnection
    };
}
