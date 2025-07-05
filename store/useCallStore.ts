'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useEffect } from 'react';

type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
type CallType = 'audio' | 'video';

interface Peer {
    id: string;
    name: string | null;
    image: string | null;
}

interface CallState {
    // Call state
    status: CallStatus;
    callType: CallType | null;
    callStartTime: Date | null;
    remoteStream: MediaStream | null;
    localStream: MediaStream | null;
    isAudioMuted: boolean;
    isVideoMuted: boolean;
    isScreenSharing: boolean;
    channelId: string | null;

    // Peer info
    caller: Peer | null;
    receiver: Peer | null;

    // Connection info
    signalData: any;
    peerConnection: any;

    // Actions
    startCall: (callType: CallType, channelId: string, receiver: Peer) => Promise<void>;
    receiveCall: (call: {
        from: string;
        to: string;
        channelId: string;
        signal: any;
        callType: CallType;
        caller: Peer;
    }) => void;
    acceptCall: () => Promise<void>;
    rejectCall: (reason?: string) => void;
    endCall: () => void;
    toggleAudio: () => void;
    toggleVideo: () => void;
    toggleScreenShare: () => Promise<void>;
    setRemoteStream: (stream: MediaStream) => void;
    reset: () => void;
}

// Helper function to log state changes (will be visible in Redux DevTools)
const logStateChange = (actionName: string, data?: any) => {
    console.log(`[CallStore] ${actionName}`, data || '');

    // Also log to the debug API if in a browser environment
    if (typeof window !== 'undefined') {
        try {
            fetch('/api/debug/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: `CallStore_${actionName}`,
                    data: data || {},
                    userId: 'store' // We don't have access to the session here
                }),
            }).catch(err => console.error('Failed to log to debug API:', err));
        } catch (error) {
            // Ignore any fetch errors
        }
    }
};

export const useCallStore = create<CallState>()(
    devtools(
        (set, get) => ({
            // Initial state
            status: 'idle',
            callType: null,
            callStartTime: null,
            remoteStream: null,
            localStream: null,
            isAudioMuted: false,
            isVideoMuted: false,
            isScreenSharing: false,
            channelId: null,
            caller: null,
            receiver: null,
            signalData: null,
            peerConnection: null,

            startCall: async (callType, channelId, receiver) => {
                logStateChange('startCall', { callType, channelId, receiver });

                try {
                    // Pre-emptively ensure socket connection - this will help prevent socketDisconnected error
                    // Note: We're using window access since the socket is in another hook
                    try {
                        if (typeof window !== 'undefined') {
                            logStateChange('ensuring_socket_connection_before_call');
                            const socketHooks = Object.values(window).filter(hook => hook && typeof hook === 'object' && 'ensureSocketConnection' in hook);
                            if (socketHooks.length > 0) {
                                // @ts-ignore - We know this exists
                                const socketHook = socketHooks[0];
                                // @ts-ignore - We know this exists
                                if (typeof socketHook.ensureSocketConnection === 'function') {
                                    // @ts-ignore - We know this exists
                                    socketHook.ensureSocketConnection();
                                    logStateChange('socket_connection_ensured');
                                }
                            } else {
                                logStateChange('socket_hook_not_found');
                            }
                        }
                    } catch (socketError) {
                        logStateChange('socket_ensure_error', { error: (socketError as Error).message });
                        // Non-fatal error, continue with call
                    }

                    // Request media devices
                    const constraints: MediaStreamConstraints = {
                        audio: true,
                        video: callType === 'video'
                    };

                    logStateChange('requesting_media_devices', constraints);
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    logStateChange('media_devices_obtained');

                    set({
                        status: 'calling',
                        callType,
                        channelId,
                        receiver,
                        localStream: stream,
                        caller: null, // We are the caller
                        isAudioMuted: false,
                        isVideoMuted: callType === 'audio'
                    });

                    return Promise.resolve();
                } catch (error) {
                    logStateChange('startCall_error', { error: (error as Error).message });
                    console.error('Error starting call:', error);
                    return Promise.reject(error);
                }
            },

            receiveCall: (call) => {
                logStateChange('receiveCall', {
                    from: call.from,
                    to: call.to,
                    channelId: call.channelId,
                    callType: call.callType,
                    caller: call.caller
                });

                // Broadcast to other windows
                try {
                    const callChannel = new BroadcastChannel('slack_clone_calls');
                    callChannel.postMessage({
                        type: 'INCOMING_CALL',
                        data: {
                            to: call.to,
                            call: call
                        }
                    });
                } catch (error) {
                    console.error('Failed to broadcast call:', error);
                }

                set({
                    status: 'ringing',
                    callType: call.callType,
                    signalData: call.signal,
                    channelId: call.channelId,
                    caller: call.caller,
                    receiver: null, // We are the receiver
                    isAudioMuted: false,
                    isVideoMuted: call.callType === 'audio'
                });
            },

            acceptCall: async () => {
                logStateChange('acceptCall');

                try {
                    const { callType, caller, channelId } = get();

                    if (!callType) {
                        throw new Error('Cannot accept call: call type is not set');
                    }

                    if (!caller) {
                        throw new Error('Cannot accept call: caller information is missing');
                    }

                    // Pre-emptively ensure socket connection - this will help prevent socketDisconnected error
                    try {
                        if (typeof window !== 'undefined') {
                            logStateChange('ensuring_socket_connection_before_accept');
                            const socketHooks = Object.values(window).filter(hook => hook && typeof hook === 'object' && 'ensureSocketConnection' in hook);
                            if (socketHooks.length > 0) {
                                // @ts-ignore - We know this exists
                                const socketHook = socketHooks[0];
                                // @ts-ignore - We know this exists
                                if (typeof socketHook.ensureSocketConnection === 'function') {
                                    // @ts-ignore - We know this exists
                                    socketHook.ensureSocketConnection();
                                    logStateChange('socket_connection_ensured_for_accept');
                                }
                            } else {
                                logStateChange('socket_hook_not_found_for_accept');
                            }
                        }
                    } catch (socketError) {
                        logStateChange('socket_ensure_error_for_accept', { error: (socketError as Error).message });
                        // Non-fatal error, continue with call
                    }

                    // Broadcast to other windows that call was accepted
                    try {
                        const callChannel = new BroadcastChannel('slack_clone_calls');
                        callChannel.postMessage({
                            type: 'CALL_ACCEPTED',
                            data: {
                                callId: channelId,
                                callerId: caller.id
                            }
                        });
                        logStateChange('broadcast_call_accepted', { channelId, callerId: caller.id });
                    } catch (error) {
                        console.error('Failed to broadcast call acceptance:', error);
                    }

                    // Request media devices
                    const constraints: MediaStreamConstraints = {
                        audio: true,
                        video: callType === 'video'
                    };

                    logStateChange('requesting_media_devices', constraints);
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    logStateChange('media_devices_obtained');

                    set({
                        status: 'connected',
                        callStartTime: new Date(),
                        localStream: stream
                    });

                    return Promise.resolve();
                } catch (error) {
                    logStateChange('acceptCall_error', { error: (error as Error).message });
                    console.error('Error accepting call:', error);
                    return Promise.reject(error);
                }
            },

            rejectCall: (reason) => {
                logStateChange('rejectCall', { reason });

                // Get the necessary data before resetting the state
                const { channelId, caller } = get();

                // Broadcast to other windows that call was rejected
                try {
                    const callChannel = new BroadcastChannel('slack_clone_calls');
                    callChannel.postMessage({
                        type: 'CALL_REJECTED',
                        data: {
                            callId: channelId,
                            callerId: caller?.id,
                            reason
                        }
                    });
                    logStateChange('broadcast_call_rejected', { channelId, callerId: caller?.id });
                } catch (error) {
                    console.error('Failed to broadcast call rejection:', error);
                }

                set({
                    status: 'idle',
                    signalData: null,
                    callType: null,
                    channelId: null,
                    caller: null
                });
            },

            endCall: () => {
                logStateChange('endCall');

                // Get the necessary data before manipulating the state
                const { localStream, channelId, caller, receiver } = get();

                // Broadcast to other windows that call has ended
                try {
                    const callChannel = new BroadcastChannel('slack_clone_calls');
                    callChannel.postMessage({
                        type: 'CALL_ENDED',
                        data: {
                            callId: channelId,
                            callerId: caller?.id,
                            receiverId: receiver?.id
                        }
                    });
                    logStateChange('broadcast_call_ended', {
                        channelId,
                        callerId: caller?.id,
                        receiverId: receiver?.id
                    });
                } catch (error) {
                    console.error('Failed to broadcast call end:', error);
                }

                // Stop all tracks in the local stream
                if (localStream) {
                    localStream.getTracks().forEach(track => track.stop());
                }

                set({
                    status: 'ended',
                    remoteStream: null,
                    localStream: null,
                    callStartTime: null,
                });

                // Reset everything after a brief delay (to show ended UI)
                setTimeout(() => {
                    logStateChange('reset_after_end');
                    set({
                        status: 'idle',
                        callType: null,
                        signalData: null,
                        channelId: null,
                        caller: null,
                        receiver: null,
                        peerConnection: null,
                        isAudioMuted: false,
                        isVideoMuted: false,
                        isScreenSharing: false
                    });
                }, 2000);
            },

            toggleAudio: () => {
                const { localStream, isAudioMuted } = get();
                logStateChange('toggleAudio', { currentlyMuted: isAudioMuted });

                if (localStream) {
                    localStream.getAudioTracks().forEach(track => {
                        track.enabled = isAudioMuted;
                    });

                    set({ isAudioMuted: !isAudioMuted });
                }
            },

            toggleVideo: () => {
                const { localStream, isVideoMuted } = get();
                logStateChange('toggleVideo', { currentlyMuted: isVideoMuted });

                if (localStream) {
                    localStream.getVideoTracks().forEach(track => {
                        track.enabled = isVideoMuted;
                    });

                    set({ isVideoMuted: !isVideoMuted });
                }
            },

            toggleScreenShare: async () => {
                const { localStream, isScreenSharing } = get();
                logStateChange('toggleScreenShare', { currentlySharing: isScreenSharing });

                if (isScreenSharing) {
                    // Restore camera
                    try {
                        const constraints: MediaStreamConstraints = {
                            audio: true,
                            video: true
                        };

                        const newStream = await navigator.mediaDevices.getUserMedia(constraints);

                        // Stop the current stream tracks
                        if (localStream) {
                            localStream.getTracks().forEach(track => track.stop());
                        }

                        set({
                            localStream: newStream,
                            isScreenSharing: false
                        });

                        return Promise.resolve();
                    } catch (error) {
                        logStateChange('stopScreenShare_error', { error: (error as Error).message });
                        console.error('Error stopping screen sharing:', error);
                        return Promise.reject(error);
                    }
                } else {
                    // Start screen sharing
                    try {
                        const screenStream = await navigator.mediaDevices.getDisplayMedia({
                            video: true
                        });

                        // Stop the current video tracks, keep audio
                        if (localStream) {
                            localStream.getVideoTracks().forEach(track => track.stop());

                            // Create a new stream with screen video and original audio
                            const newStream = new MediaStream();

                            // Add audio tracks from the original stream
                            localStream.getAudioTracks().forEach(track => newStream.addTrack(track));

                            // Add video track from screen sharing
                            screenStream.getVideoTracks().forEach(track => newStream.addTrack(track));

                            set({
                                localStream: newStream,
                                isScreenSharing: true
                            });
                        }

                        return Promise.resolve();
                    } catch (error) {
                        logStateChange('startScreenShare_error', { error: (error as Error).message });
                        console.error('Error starting screen sharing:', error);
                        return Promise.reject(error);
                    }
                }
            },

            setRemoteStream: (stream) => {
                logStateChange('setRemoteStream', { hasStream: !!stream });
                set({ remoteStream: stream });
            },

            reset: () => {
                logStateChange('reset');

                const { localStream } = get();

                // Stop all tracks in the local stream
                if (localStream) {
                    localStream.getTracks().forEach(track => track.stop());
                }

                set({
                    status: 'idle',
                    callType: null,
                    callStartTime: null,
                    remoteStream: null,
                    localStream: null,
                    isAudioMuted: false,
                    isVideoMuted: false,
                    isScreenSharing: false,
                    channelId: null,
                    caller: null,
                    receiver: null,
                    signalData: null,
                    peerConnection: null
                });
            }
        }),
        { name: 'call-store' }
    )
);

// Hook to listen for broadcast channel messages
// This should be used in a component with access to the session
export const useCallBroadcastListener = (session: any) => {
    const receiveCall = useCallStore(state => state.receiveCall);
    const reset = useCallStore(state => state.reset);
    const status = useCallStore(state => state.status);
    const channelId = useCallStore(state => state.channelId);

    useEffect(() => {
        if (!session?.user?.id) return;

        // Create a BroadcastChannel for call notifications
        const callChannel = new BroadcastChannel('slack_clone_calls');
        console.log('[BroadcastChannel] Listening for call events with user ID:', session.user.id);

        callChannel.onmessage = (event) => {
            const { type, data } = event.data;
            console.log('[BroadcastChannel] Received message:', type, data);

            if (type === 'INCOMING_CALL' && data.to === session.user.id) {
                // Receive call in all windows
                console.log('[BroadcastChannel] Receiving incoming call in this window', data.call);
                receiveCall(data.call);
            }

            if (type === 'CALL_ACCEPTED' && data.callId === channelId) {
                // If another window accepted the call and we're showing the call UI, close it
                if (status === 'ringing' || status === 'calling') {
                    console.log('[BroadcastChannel] Call accepted in another window, resetting this instance');
                    reset(); // Use reset to avoid another broadcast
                }
            }

            if (type === 'CALL_REJECTED' && data.callId === channelId) {
                // If another window rejected the call and we're showing the call UI, close it
                if (status === 'ringing' || status === 'calling') {
                    console.log('[BroadcastChannel] Call rejected in another window, resetting this instance');
                    reset();
                }
            }

            if (type === 'CALL_ENDED' && data.callId === channelId) {
                // If call ended in another window, make sure it's ended here too
                if (status !== 'idle') {
                    console.log('[BroadcastChannel] Call ended in another window, resetting this instance');
                    reset();
                }
            }
        };

        return () => {
            console.log('[BroadcastChannel] Closing call channel listener');
            callChannel.close();
        };
    }, [session?.user?.id, receiveCall, reset, status, channelId]);
};
