'use client';

import { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { useSocket } from '@/hooks/useSocket';
import { useSession } from 'next-auth/react';
import { useCallStore } from '@/store/useCallStore';
import { useDebugLogger } from '@/hooks/useDebugLogger';

interface WebRTCConnectionProps {
    isInitiator: boolean;
}

export function WebRTCConnection({ isInitiator }: WebRTCConnectionProps) {
    const { data: session } = useSession();
    const { logEvent } = useDebugLogger();
    const [isPeerInitialized, setIsPeerInitialized] = useState(false);
    const [socketRetryCount, setSocketRetryCount] = useState(0);
    const socketRetryRef = useRef<NodeJS.Timeout | null>(null);
    const {
        socket,
        isConnected,
        callUser: socketCallUser,
        answerCall: socketAnswerCall,
        sendIceCandidate
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
        logEvent('WebRTCConnection_Mounted', {
            isInitiator,
            status,
            socketConnected: isConnected,
            hasLocalStream: !!localStream,
            hasSignalData: !!signalData,
            caller: caller || null,
            receiver: receiver || null
        });

        return () => {
            logEvent('WebRTCConnection_Unmounted', { isInitiator });
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

        logEvent('SocketListeners_Setup', { isInitiator, socketConnected: isConnected });

        // Handle incoming answer to our call
        const handleCallAnswer = ({ signal, from }: { from: string; to: string; signal: any }) => {
            logEvent('CallAnswer_Received', { from, signal: !!signal });

            if (peerRef.current && isInitiator) {
                try {
                    logEvent('Applying_Answer_Signal', { peerExists: !!peerRef.current });
                    peerRef.current.signal(signal);
                } catch (error) {
                    logEvent('Error_Applying_Answer', { error: (error as Error).message });
                    console.error('Error applying answer signal:', error);
                }
            } else {
                logEvent('Cannot_Apply_Answer', {
                    hasPeer: !!peerRef.current,
                    isInitiator
                });
            }
        };

        // Handle ICE candidates
        const handleIceCandidate = ({ candidate, from }: { from: string; to: string; candidate: any }) => {
            logEvent('ICE_Candidate_Received', { from });

            if (peerRef.current) {
                try {
                    logEvent('Applying_ICE_Candidate');
                    peerRef.current.signal({ type: 'candidate', candidate });
                } catch (error) {
                    logEvent('Error_Applying_ICE', { error: (error as Error).message });
                    console.error('Error applying ICE candidate:', error);
                }
            }
        };

        // Handle call ended
        const handleCallEnded = ({ from }: { from: string; to: string; reason?: string }) => {
            logEvent('Call_Ended_By_Remote', { from });
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

            logEvent('SocketListeners_Cleaned', { isInitiator });
        };
    }, [socket, isConnected, session?.user?.id, endCall, isInitiator, logEvent]);

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
            // Log the attempt and missing requirements
            logEvent('Peer_Creation_Requirements_Check', {
                ...missingRequirements,
                willRetry: missingRequirements.socketDisconnected && socketRetryCount < 5,
                retryCount: socketRetryCount
            });

            // If socket is the only issue, retry
            if (missingRequirements.socketDisconnected && !missingRequirements.sessionMissing &&
                !missingRequirements.streamMissing && socketRetryCount < 5) {

                logEvent('Scheduling_Socket_Retry', { retryCount: socketRetryCount + 1 });

                // Schedule retry with exponential backoff (1s, 2s, 4s, 8s)
                socketRetryRef.current = setTimeout(() => {
                    setSocketRetryCount(prev => prev + 1);
                }, Math.min(1000 * (2 ** socketRetryCount), 8000));

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
            logEvent('Initiator_Wrong_Status', { status });
            return;
        }

        if (!isInitiator && status !== 'connected') {
            logEvent('Receiver_Wrong_Status', { status });
            return;
        }

        // Check if we already initialized the peer for this connection
        if (isPeerInitialized && peerRef.current) {
            logEvent('Peer_Already_Initialized');
            return;
        }

        logEvent('Creating_Peer', {
            role: isInitiator ? 'initiator' : 'receiver',
            hasSignalData: !!signalData,
            socketConnected: isConnected
        });

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
                logEvent('Receiver_Signaling_With_Offer', { hasData: !!signalData });
                try {
                    peer.signal(signalData);
                } catch (error) {
                    logEvent('Error_Applying_Offer', { error: (error as Error).message });
                    console.error('Error applying offer signal:', error);
                }
            }

            // Handle signals for connection negotiation
            peer.on('signal', (data) => {
                logEvent('Generated_Signal', {
                    signalType: data.type,
                    isInitiator
                });

                if (isInitiator && receiver) {
                    // Initiator sends call offer
                    logEvent('Initiator_Sending_Call', { to: receiver.id });
                    socketCallUser(receiver.id, channelId!, data, callType!);
                } else if (!isInitiator && caller) {
                    // Receiver sends answer
                    logEvent('Receiver_Sending_Answer', { to: caller.id });
                    socketAnswerCall(caller.id, data);
                }
            });

            // Handle incoming stream
            peer.on('stream', (incomingStream) => {
                logEvent('Received_Remote_Stream');
                setRemoteStream(incomingStream);
            });

            // Handle connection status
            peer.on('connect', () => {
                logEvent('Peer_Connected', { isInitiator });
                console.log('Peer connection established!');
            });

            // Handle ICE state changes
            peer.on('iceStateChange', (state) => {
                logEvent('ICE_State_Changed', { state });
            });

            // Handle errors
            peer.on('error', (err) => {
                logEvent('Peer_Error', { error: err.message });
                console.error('Peer connection error:', err);
                endCall();
            });

            // Handle close events
            peer.on('close', () => {
                logEvent('Peer_Connection_Closed');
                console.log('Peer connection closed');
            });

            // Store the peer instance
            peerRef.current = peer;
            setIsPeerInitialized(true);

            // Clean up on unmount
            return () => {
                logEvent('Cleaning_Up_Peer');
                if (peerRef.current) {
                    peerRef.current.destroy();
                    peerRef.current = null;
                }
                setIsPeerInitialized(false);
            };
        } catch (error) {
            logEvent('Failed_To_Create_Peer', { error: (error as Error).message });
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
        logEvent,
        socketRetryCount
    ]);

    // This component doesn't render anything, it just manages the connection
    return null;
}
