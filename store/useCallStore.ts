'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

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
                    const { callType, caller } = get();

                    if (!callType) {
                        throw new Error('Cannot accept call: call type is not set');
                    }

                    if (!caller) {
                        throw new Error('Cannot accept call: caller information is missing');
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

                const { localStream } = get();

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
