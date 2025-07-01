'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useMessageStore } from '@/store/useMessageStore';
import { useChannelStore } from '@/store/useChannelStore';
import { useCallStore } from '@/store/useCallStore';  // Import the call store
import { useSession } from 'next-auth/react';
import { CallModal } from '@/components/call/CallModal';

interface RealTimeProviderProps {
    children: ReactNode;
}

interface RealTimeContextType {
    isConnected: boolean;
    typingUsers: Record<string, { userId: string; userName: string | null; timestamp: number }[]>;
}

const RealTimeContext = createContext<RealTimeContextType>({
    isConnected: false,
    typingUsers: {},
});

export function RealTimeProvider({ children }: RealTimeProviderProps) {
    const { data: session } = useSession();
    const { socket, isConnected } = useSocket();
    const { addMessage, fetchMessages } = useMessageStore();
    const { updateLatestMessage, updateChannel } = useChannelStore();
    const { receiveCall, setRemoteStream } = useCallStore();
    const [typingUsers, setTypingUsers] = useState<Record<string, { userId: string; userName: string | null; timestamp: number }[]>>({});

    // Listen for real-time events
    useEffect(() => {
        if (!socket || !isConnected || !session?.user?.id) {
            return;
        }

        // Handle new messages
        socket.on('newMessage', (message) => {
            console.log('Received new message:', message);

            // Add the message to the store with required fields
            addMessage({
                ...message,
                // Add missing updatedAt field from Message interface
                updatedAt: message.createdAt,
            });

            // Update the latest message in the channel
            updateLatestMessage(message.channelId, {
                id: message.id,
                content: message.content,
                createdAt: message.createdAt,
                user: {
                    name: message.user.name,
                    image: message.user.image
                }
            });
        });

        // Handle channel updates
        socket.on('channelUpdated', (channel) => {
            console.log('Channel updated:', channel);
            updateChannel(channel.id, channel);
        });

        // Handle typing indicators
        socket.on('typing', ({ channelId, userId, userName }) => {
            // Don't show typing indicator for current user
            if (userId === session.user.id) return;

            setTypingUsers((prev) => {
                const channelTypers = prev[channelId] || [];
                // Check if this user is already in typing list
                const existingIndex = channelTypers.findIndex(u => u.userId === userId);

                if (existingIndex >= 0) {
                    // Update existing entry
                    const updated = [...channelTypers];
                    updated[existingIndex] = { userId, userName, timestamp: Date.now() };
                    return { ...prev, [channelId]: updated };
                } else {
                    // Add new entry
                    return {
                        ...prev,
                        [channelId]: [...channelTypers, { userId, userName, timestamp: Date.now() }]
                    };
                }
            });
        });

        // Handle stop typing indicators
        socket.on('stopTyping', ({ channelId, userId }) => {
            setTypingUsers((prev) => {
                const channelTypers = prev[channelId] || [];
                // Remove this user from typing list
                const updated = channelTypers.filter(u => u.userId !== userId);
                return { ...prev, [channelId]: updated };
            });
        });

        // Handle incoming call offer
        socket.on('callOffer', (data) => {
            console.log('⭐ Incoming call offer received:', data);
            // Verify this call is for the current user
            if (data.to === session.user.id) {
                console.log('Call is for the current user, processing it...');
                receiveCall({
                    from: data.from,
                    to: data.to,
                    channelId: data.channelId,
                    signal: data.signal,
                    callType: data.callType,
                    caller: data.caller
                });
            } else {
                console.warn('Received call offer not meant for this user:',
                    `call recipient: ${data.to}, current user: ${session.user.id}`);
            }
        });

        // Handle call answer
        socket.on('callAnswer', (data) => {
            console.log('Call answered:', data);
            // The WebRTC connection component will handle this event
        });

        // Handle call rejection
        socket.on('callRejected', (data) => {
            console.log('Call rejected:', data);
            // The WebRTC connection component will handle this event
        });

        // Handle call ended
        socket.on('callEnded', (data) => {
            console.log('Call ended:', data);
            // The WebRTC connection component will handle this event
        });

        // Handle ICE candidates
        socket.on('iceCandidate', (data) => {
            console.log('Received ICE candidate');
            // The WebRTC connection component will handle this event
        });

        // Clean up listeners
        return () => {
            socket.off('newMessage');
            socket.off('channelUpdated');
            socket.off('typing');
            socket.off('stopTyping');
            socket.off('callOffer');
            socket.off('callAnswer');
            socket.off('callRejected');
            socket.off('callEnded');
            socket.off('iceCandidate');
        };
    }, [socket, isConnected, session?.user?.id, addMessage, updateLatestMessage, updateChannel, receiveCall]);

    // Clean up stale typing indicators
    useEffect(() => {
        const interval = setInterval(() => {
            setTypingUsers((prev) => {
                const now = Date.now();
                const updated: Record<string, { userId: string; userName: string | null; timestamp: number }[]> = {};
                let hasChanges = false;

                // For each channel, filter out typing indicators older than 5 seconds
                Object.keys(prev).forEach(channelId => {
                    const recent = prev[channelId].filter(u => now - u.timestamp < 5000);
                    if (recent.length !== prev[channelId].length) {
                        hasChanges = true;
                    }
                    if (recent.length > 0) {
                        updated[channelId] = recent;
                    }
                });

                return hasChanges ? updated : prev;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <RealTimeContext.Provider value={{ isConnected, typingUsers }}>
            {children}
            {/* Include the CallModal component here so it's available throughout the app */}
            {typeof window !== 'undefined' && <CallModal />}
        </RealTimeContext.Provider>
    );
}

export const useRealTime = () => useContext(RealTimeContext);
