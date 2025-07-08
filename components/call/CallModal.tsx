'use client';

import { useEffect, useRef } from 'react';
import { useCallStore } from '@/store/useCallStore';
import {
    Phone,
    PhoneOff,
    Mic,
    MicOff,
    Video,
    VideoOff,
    MonitorSmartphone,
    X,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WebRTCConnection } from './WebRTCConnection';
import { useSession } from 'next-auth/react';
import { useSocket } from '@/hooks/useSocket';

export function CallModal() {
    const { data: session } = useSession();
    const { isConnected: socketConnected } = useSocket();
    const {
        status,
        callType,
        remoteStream,
        localStream,
        isAudioMuted,
        isVideoMuted,
        isScreenSharing,
        caller,
        receiver,
        acceptCall,
        rejectCall,
        endCall,
        toggleAudio,
        toggleVideo,
        toggleScreenShare
    } = useCallStore();

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    // Monitor call status
    useEffect(() => {
        // No debug logging in production
    }, [status, callType, localStream, remoteStream, caller, receiver, session, socketConnected]);

    // Connect local stream to video element
    useEffect(() => {
        if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Connect remote stream to video element
    useEffect(() => {
        if (remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // Don't render anything if not in a call
    if (status === 'idle') {
        return null;
    }

    // Determine if this user is the caller or recipient
    // If we have a caller object, then we are the receiver
    // If we don't have a caller object, then we are the caller (initiator)
    const isInitiator = caller === null;

    // Different UI based on call status
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
            <div className="bg-card rounded-lg shadow-lg border border-border max-w-3xl w-full">
                {/* Call header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold">
                            {status === 'ringing' ? 'Incoming Call' :
                                status === 'calling' ? 'Calling...' :
                                    'Call in Progress'}
                        </h2>
                        <p className="text-muted-foreground">
                            {callType === 'video' ? 'Video Call' : 'Audio Call'} ·
                            {caller && ` from ${caller.name || 'Unknown User'}`}
                            {receiver && ` to ${receiver.name || 'Unknown User'}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {isInitiator ? 'You are the caller' : 'You are the receiver'} ·
                            Socket: {socketConnected ? 'Connected' : 'Disconnected'}
                        </p>
                    </div>
                    <button
                        onClick={endCall}
                        className="p-2 rounded-full hover:bg-muted transition"
                        aria-label="End call"
                    >
                        <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Call content */}
                <div className={cn(
                    "p-6 flex flex-col",
                    callType === 'video' ? 'h-[70vh]' : 'h-[40vh]'
                )}>
                    {/* Ringing UI */}
                    {status === 'ringing' && (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                            <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center">
                                {callType === 'video' ? (
                                    <Video className="h-12 w-12 text-primary animate-pulse" />
                                ) : (
                                    <Phone className="h-12 w-12 text-primary animate-pulse" />
                                )}
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-semibold">{caller?.name || 'Unknown User'}</p>
                                <p className="text-muted-foreground">is calling you...</p>
                            </div>
                            <div className="flex space-x-4">
                                <button
                                    onClick={() => rejectCall()}
                                    className="p-3 bg-destructive rounded-full hover:bg-destructive/90 transition"
                                    aria-label="Reject call"
                                >
                                    <PhoneOff className="h-6 w-6 text-destructive-foreground" />
                                </button>
                                <button
                                    onClick={() => acceptCall().catch(error => console.error(error))}
                                    className="p-3 bg-green-500 rounded-full hover:bg-green-600 transition"
                                    aria-label="Accept call"
                                >
                                    <Phone className="h-6 w-6 text-white" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Calling UI */}
                    {status === 'calling' && (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                            <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center">
                                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-semibold">{receiver?.name || 'Unknown User'}</p>
                                <p className="text-muted-foreground">Calling...</p>
                            </div>
                            <div className="flex space-x-4">
                                <button
                                    onClick={() => endCall()}
                                    className="p-3 bg-destructive rounded-full hover:bg-destructive/90 transition"
                                    aria-label="End call"
                                >
                                    <PhoneOff className="h-6 w-6 text-destructive-foreground" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Connected UI - Video Call */}
                    {status === 'connected' && callType === 'video' && (
                        <div className="relative flex-1 flex flex-col">
                            {/* Remote video (large) */}
                            <div className="flex-1 bg-black rounded-lg overflow-hidden">
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    className="h-full w-full object-cover"
                                />
                            </div>

                            {/* Local video (small overlay) */}
                            <div className="absolute bottom-4 right-4 w-1/4 rounded-lg overflow-hidden border-2 border-background shadow-lg bg-black">
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className={cn(
                                        "h-full w-full object-cover",
                                        isVideoMuted && 'hidden'
                                    )}
                                />
                                {isVideoMuted && (
                                    <div className="h-full w-full bg-muted flex items-center justify-center">
                                        <VideoOff className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Connected UI - Audio Call */}
                    {status === 'connected' && callType === 'audio' && (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="h-32 w-32 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                                <Phone className="h-16 w-16 text-primary animate-pulse" />
                            </div>
                            <p className="text-xl font-semibold mb-1">
                                {(caller?.name || receiver?.name) || 'Unknown User'}
                            </p>
                            <p className="text-muted-foreground mb-6">Call in progress</p>

                            {/* Audio element for remote stream */}
                            <audio ref={remoteVideoRef} autoPlay />
                        </div>
                    )}
                </div>

                {/* Call controls */}
                {status === 'connected' && (
                    <div className="p-4 border-t border-border flex items-center justify-center space-x-4">
                        <button
                            onClick={() => toggleAudio()}
                            className={cn(
                                "p-3 rounded-full transition",
                                isAudioMuted ? "bg-destructive" : "bg-muted hover:bg-muted/80"
                            )}
                            aria-label={isAudioMuted ? "Unmute microphone" : "Mute microphone"}
                        >
                            {isAudioMuted ? (
                                <MicOff className="h-6 w-6" />
                            ) : (
                                <Mic className="h-6 w-6" />
                            )}
                        </button>

                        {callType === 'video' && (
                            <button
                                onClick={() => toggleVideo()}
                                className={cn(
                                    "p-3 rounded-full transition",
                                    isVideoMuted ? "bg-destructive" : "bg-muted hover:bg-muted/80"
                                )}
                                aria-label={isVideoMuted ? "Turn on camera" : "Turn off camera"}
                            >
                                {isVideoMuted ? (
                                    <VideoOff className="h-6 w-6" />
                                ) : (
                                    <Video className="h-6 w-6" />
                                )}
                            </button>
                        )}

                        {callType === 'video' && (
                            <button
                                onClick={() => toggleScreenShare().catch(console.error)}
                                className={cn(
                                    "p-3 rounded-full transition",
                                    isScreenSharing ? "bg-primary" : "bg-muted hover:bg-muted/80"
                                )}
                                aria-label={isScreenSharing ? "Stop screen sharing" : "Share screen"}
                            >
                                <MonitorSmartphone className="h-6 w-6" />
                            </button>
                        )}

                        <button
                            onClick={() => endCall()}
                            className="p-3 bg-destructive rounded-full hover:bg-destructive/90 transition"
                            aria-label="End call"
                        >
                            <PhoneOff className="h-6 w-6 text-destructive-foreground" />
                        </button>
                    </div>
                )}
            </div>

            {/* Always render WebRTCConnection component with correct initiator flag */}
            {(status === 'calling' || status === 'connected') && (
                <WebRTCConnection isInitiator={isInitiator} />
            )}
        </div>
    );
}
