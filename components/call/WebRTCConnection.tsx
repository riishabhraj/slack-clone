'use client';

import { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { useSocket } from '@/hooks/useSocket';
import { useSession } from 'next-auth/react';
import { useCallStore } from '@/store/useCallStore';

interface WebRTCConnectionProps {
    isInitiator: boolean;
}

export function WebRTCConnection({ isInitiator }: WebRTCConnectionProps) {
    const { data: session } = useSession();
    const [isPeerInitialized, setIsPeerInitialized] = useState(false);
    const [socketRetryCount, setSocketRetryCount] = useState(0);
    const socketRetryRef = useRef<NodeJS.Timeout | null>(null);
    const {
        socket,
        isConnected,
        callUser: socketCallUser,
        answerCall: socketAnswerCall,
        sendIceCandidate,
        ensureSocketConnection // Add ensureSocketConnection to the destructured values
    } = useSocket();

    const {
        callType,
        signalData,
        localStream,
        status,
        caller,
        receiver,
        channelId,
        setRemoteStream,
        endCall
    } = useCallStore();

    const peerRef = useRef<Peer.Instance | null>(null);

    // Log component initialization
    useEffect(() => {
        return () => {
            // Clear any retry timers on unmount
            if (socketRetryRef.current) {
                clearTimeout(socketRetryRef.current);
                socketRetryRef.current = null;
            }
        };
    }, []);

    // Handle socket event listeners separately to ensure they're properly set up even if peer isn't ready
    useEffect(() => {
        if (!socket || !isConnected || !session?.user?.id) {
            return;
        }

        // Handle incoming answer to our call
        const handleCallAnswer = ({ signal, from }: { from: string; to: string; signal: any }) => {
            if (peerRef.current && isInitiator) {
                try {
                    peerRef.current.signal(signal);
                } catch (error) {
                    console.error('Error applying answer signal:', error);
                }
            }
        };

        // Handle ICE candidates
        const handleIceCandidate = ({ candidate, from }: { from: string; to: string; candidate: any }) => {
            if (peerRef.current) {
                try {
                    peerRef.current.signal({ type: 'candidate', candidate });
                } catch (error) {
                    console.error('Error applying ICE candidate:', error);
                }
            }
        };

        // Handle call ended
        const handleCallEnded = ({ from }: { from: string; to: string; reason?: string }) => {
            endCall();
        };

        // Set up listeners
        socket.on('callAnswer', handleCallAnswer);
        socket.on('iceCandidate', handleIceCandidate);
        socket.on('callEnded', handleCallEnded);
        socket.on('callRejected', handleCallEnded);

        // Clean up listeners
        return () => {
            socket.off('callAnswer', handleCallAnswer);
            socket.off('iceCandidate', handleIceCandidate);
            socket.off('callEnded', handleCallEnded);
            socket.off('callRejected', handleCallEnded);
        };
    }, [socket, isConnected, session?.user?.id, endCall, isInitiator]);

    // Create and manage the peer connection with auto retry for socket connection
    useEffect(() => {
        // Clean up any existing retry timer
        if (socketRetryRef.current) {
            clearTimeout(socketRetryRef.current);
            socketRetryRef.current = null;
        }

        // Check conditions for creating peer
        const missingRequirements = {
            socketMissing: !socket,
            socketDisconnected: !isConnected,
            sessionMissing: !session?.user?.id,
            streamMissing: !localStream
        };

        const hasMissingRequirements = Object.values(missingRequirements).some(Boolean);

        // If any requirement is missing
        if (hasMissingRequirements) {
            // If socket is disconnected, try to reconnect immediately first using ensureSocketConnection
            if (missingRequirements.socketDisconnected) {
                try {
                    // Use the ensureSocketConnection function which is more robust than just socket.connect()
                    const connected = ensureSocketConnection();
                } catch (e) {
                    // Handle immediate reconnect error
                }
            }

            // If socket is the only issue, retry with exponential backoff
            if (missingRequirements.socketDisconnected && !missingRequirements.sessionMissing &&
                !missingRequirements.streamMissing && socketRetryCount < 5) {

                // Schedule retry with exponential backoff (1s, 2s, 4s, 8s, 10s)
                socketRetryRef.current = setTimeout(() => {
                    // Try to force reconnect if we have access to that function
                    if (typeof socket?.connect === 'function') {
                        socket.connect();
                    }

                    setSocketRetryCount(prev => prev + 1);
                }, Math.min(1000 * (2 ** socketRetryCount), 10000));

                return;
            }

            // Otherwise give up for now
            return;
        }

        // Reset retry count when socket is connected
        if (socketRetryCount > 0) {
            setSocketRetryCount(0);
        }

        // Only proceed if we're in the right state to create a connection
        if (isInitiator && status !== 'calling') {
            return;
        }

        if (!isInitiator && status !== 'connected') {
            return;
        }

        // Check if we already initialized the peer for this connection
        if (isPeerInitialized && peerRef.current) {
            return;
        }

        try {
            // Create the peer connection
            const peer = new Peer({
                initiator: isInitiator,
                trickle: true,
                stream: localStream as MediaStream, // We know it's not null here because we check above
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });

            // If we're the receiver, feed in the signal data from the caller
            if (!isInitiator && signalData) {
                try {
                    peer.signal(signalData);
                } catch (error) {
                    console.error('Error applying offer signal:', error);
                }
            }

            // Handle signals for connection negotiation
            peer.on('signal', (data) => {
                if (isInitiator && receiver) {
                    // Initiator sends call offer
                    socketCallUser(receiver.id, channelId!, data, callType!);
                } else if (!isInitiator && caller) {
                    // Receiver sends answer
                    socketAnswerCall(caller.id, data);
                }
            });

            // Handle incoming stream
            peer.on('stream', (incomingStream) => {
                setRemoteStream(incomingStream);
            });

            // Handle connection status
            peer.on('connect', () => {
                console.log('Peer connection established!');
            });

            // Handle ICE state changes
            peer.on('iceStateChange', (state) => {
            });

            // Handle errors
            peer.on('error', (err) => {
                console.error('Peer connection error:', err);
                endCall();
            });

            // Handle close events
            peer.on('close', () => {
                console.log('Peer connection closed');
            });

            // Store the peer instance
            peerRef.current = peer;
            setIsPeerInitialized(true);

            // Clean up on unmount
            return () => {
                if (peerRef.current) {
                    peerRef.current.destroy();
                    peerRef.current = null;
                }
                setIsPeerInitialized(false);
            };
        } catch (error) {
            console.error('Failed to create peer connection:', error);
            endCall();
        }
    }, [
        isInitiator,
        socket,
        isConnected,
        session?.user?.id,
        localStream,
        status,
        signalData,
        callType,
        channelId,
        caller,
        receiver,
        socketCallUser,
        socketAnswerCall,
        setRemoteStream,
        endCall,
        isPeerInitialized,
        socketRetryCount
    ]);

    // This component doesn't render anything, it just manages the connection
    return null;
}
