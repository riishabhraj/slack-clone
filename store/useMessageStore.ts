import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useChannelStore } from './useChannelStore';

export interface Message {
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
    channelId: string;
    user: {
        id: string;
        name: string | null;
        image: string | null;
    };
}

interface MessageState {
    messages: Message[];
    isLoading: boolean;
    error: string | null;
    hasMore: boolean;
    nextCursor: string | null;

    // Actions
    setMessages: (messages: Message[]) => void;
    addMessage: (message: Message) => void;
    fetchMessages: (channelId: string, limit?: number) => Promise<void>;
    loadMoreMessages: (channelId: string, limit?: number) => Promise<void>;
    sendMessage: (content: string, channelId: string) => Promise<void>;
    reset: () => void;
}

export const useMessageStore = create<MessageState>()(
    devtools(
        (set, get) => ({
            messages: [],
            isLoading: false,
            error: null,
            hasMore: false,
            nextCursor: null,

            setMessages: (messages) => set({ messages }),

            addMessage: (message) => set((state) => ({
                messages: [...state.messages, message]
            })),

            fetchMessages: async (channelId, limit = 50) => {
                set({ isLoading: true, error: null });

                try {
                    const response = await fetch(`/api/messages?channelId=${channelId}&limit=${limit}`);

                    if (!response.ok) {
                        throw new Error('Failed to fetch messages');
                    }

                    const data = await response.json();

                    set({
                        messages: data.messages,
                        nextCursor: data.nextCursor,
                        hasMore: data.hasMore,
                        isLoading: false
                    });
                } catch (error) {
                    console.error('Error fetching messages:', error);
                    set({
                        error: error instanceof Error ? error.message : 'An error occurred',
                        isLoading: false
                    });
                }
            },

            loadMoreMessages: async (channelId, limit = 50) => {
                const { nextCursor, isLoading } = get();

                // Don't fetch if we're already loading or there's no next cursor
                if (isLoading || !nextCursor) return;

                set({ isLoading: true, error: null });

                try {
                    const response = await fetch(`/api/messages?channelId=${channelId}&cursor=${nextCursor}&limit=${limit}`);

                    if (!response.ok) {
                        throw new Error('Failed to load more messages');
                    }

                    const data = await response.json();

                    set((state) => ({
                        messages: [...state.messages, ...data.messages],
                        nextCursor: data.nextCursor,
                        hasMore: data.hasMore,
                        isLoading: false
                    }));
                } catch (error) {
                    console.error('Error loading more messages:', error);
                    set({
                        error: error instanceof Error ? error.message : 'An error occurred',
                        isLoading: false
                    });
                }
            },

            sendMessage: async (content, channelId) => {
                try {
                    const response = await fetch('/api/messages', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ content, channelId })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to send message');
                    }

                    const message = await response.json();
                    // Add the new message to the store
                    get().addMessage(message);

                    // Update the channel's latest message
                    const { updateLatestMessage } = useChannelStore.getState();
                    updateLatestMessage(channelId, {
                        id: message.id,
                        content: message.content,
                        createdAt: message.createdAt,
                        user: {
                            name: message.user.name,
                            image: message.user.image
                        }
                    });
                } catch (error) {
                    console.error('Error sending message:', error);
                    set({
                        error: error instanceof Error ? error.message : 'An error occurred'
                    });
                    throw error; // Re-throw so the UI can handle it
                }
            },

            reset: () => set({
                messages: [],
                isLoading: false,
                error: null,
                hasMore: false,
                nextCursor: null
            })
        }),
        { name: 'message-store' }
    )
);
