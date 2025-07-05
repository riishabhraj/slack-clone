import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Channel {
    id: string;
    name: string;
    description: string | null;
    isPrivate: boolean;
    createdAt: string;
    updatedAt: string;
    ownerId: string;
    isMember: boolean;
    memberCount: number;
    messageCount?: number;
    owner?: {
        id: string;
        name: string | null;
        image: string | null;
    };
    members?: Array<{
        id: string;
        name: string | null;
        image: string | null;
        email: string | null;
    }>;
    admins?: Array<{
        id: string;
        name: string | null;
        image: string | null;
        email: string | null;
    }>;
    latestMessage?: {
        id: string;
        content: string;
        createdAt: string;
        user: {
            name: string | null;
            image: string | null;
        };
    } | null;
}

interface ChannelState {
    channels: Channel[];
    activeChannel: Channel | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    setChannels: (channels: Channel[]) => void;
    setActiveChannel: (channelId: string | null) => void;
    addChannel: (channel: Channel) => void;
    updateChannel: (channelId: string, updates: Partial<Channel>) => void;
    removeChannel: (channelId: string) => void;
    joinChannel: (channelId: string) => void;
    leaveChannel: (channelId: string) => void;
    inviteUserToChannel: (channelId: string, userId: string) => Promise<string | null>;
    promoteToChannelOwner: (channelId: string, userId: string) => Promise<string | null>;
    makeChannelAdmin: (channelId: string, userId: string) => Promise<string | null>;
    fetchChannels: () => Promise<void>;
    fetchChannelDetails: (channelId: string) => Promise<void>;
    updateLatestMessage: (channelId: string, message: {
        id: string;
        content: string;
        createdAt: string;
        user: {
            name: string | null;
            image: string | null;
        };
    }) => void;
}

export const useChannelStore = create<ChannelState>()(
    devtools(
        (set, get) => ({
            channels: [],
            activeChannel: null,
            isLoading: false,
            error: null,

            setChannels: (channels) => set({ channels }),

            setActiveChannel: (channelId) => {
                if (!channelId) {
                    set({ activeChannel: null });
                    return;
                }

                const { channels } = get();
                const channel = channels.find(c => c.id === channelId) || null;

                if (channel) {
                    set({ activeChannel: channel });
                } else {
                    // If we don't have the channel in our list, fetch its details
                    get().fetchChannelDetails(channelId);
                }
            },

            addChannel: (channel) => set((state) => ({
                channels: [channel, ...state.channels]
            })),

            updateChannel: (channelId, updates) => set((state) => ({
                channels: state.channels.map(c =>
                    c.id === channelId ? { ...c, ...updates } : c
                ),
                // Also update active channel if it's the one being updated
                activeChannel: state.activeChannel?.id === channelId
                    ? { ...state.activeChannel, ...updates }
                    : state.activeChannel
            })),

            removeChannel: (channelId) => set((state) => ({
                channels: state.channels.filter(c => c.id !== channelId),
                // Reset active channel if it's the one being removed
                activeChannel: state.activeChannel?.id === channelId ? null : state.activeChannel
            })),

            joinChannel: (channelId) => set((state) => ({
                channels: state.channels.map(c =>
                    c.id === channelId
                        ? { ...c, isMember: true, memberCount: c.memberCount + 1 }
                        : c
                ),
                // Update active channel if it's the one being joined
                activeChannel: state.activeChannel?.id === channelId
                    ? { ...state.activeChannel, isMember: true, memberCount: state.activeChannel.memberCount + 1 }
                    : state.activeChannel
            })),

            leaveChannel: (channelId) => set((state) => ({
                channels: state.channels.map(c =>
                    c.id === channelId
                        ? { ...c, isMember: false, memberCount: c.memberCount - 1 }
                        : c
                ),
                // Update active channel if it's the one being left
                activeChannel: state.activeChannel?.id === channelId
                    ? { ...state.activeChannel, isMember: false, memberCount: state.activeChannel.memberCount - 1 }
                    : state.activeChannel
            })),

            fetchChannels: async () => {
                set({ isLoading: true, error: null });

                try {
                    const response = await fetch('/api/channels');

                    if (!response.ok) {
                        throw new Error('Failed to fetch channels');
                    }

                    const data = await response.json();
                    set({ channels: data, isLoading: false });
                } catch (error) {
                    console.error('Error fetching channels:', error);
                    set({
                        error: error instanceof Error ? error.message : 'An error occurred',
                        isLoading: false
                    });
                }
            },

            fetchChannelDetails: async (channelId) => {
                if (!channelId) return;

                set((state) => ({
                    isLoading: true,
                    error: null
                }));

                try {
                    const response = await fetch(`/api/channels/${channelId}`);

                    if (!response.ok) {
                        // Try to parse error details from the response
                        try {
                            const errorData = await response.json();
                            if (errorData && errorData.error) {
                                throw new Error(errorData.error);
                            }
                        } catch (parseError) {
                            // If we can't parse the error, fall back to status code checks
                            if (response.status === 403) {
                                throw new Error('ACCESS_DENIED');
                            } else if (response.status === 404) {
                                throw new Error('NOT_FOUND');
                            }
                        }

                        // Generic error fallback
                        throw new Error('Failed to fetch channel details');
                    }

                    const channel = await response.json();

                    set((state) => ({
                        activeChannel: channel,
                        channels: state.channels.some(c => c.id === channelId)
                            ? state.channels.map(c => c.id === channelId ? channel : c)
                            : [channel, ...state.channels],
                        isLoading: false
                    }));
                } catch (error) {
                    console.error('Error fetching channel details:', error);
                    // Store the specific error code
                    const errorMessage = error instanceof Error ? error.message : 'An error occurred';

                    set({
                        error: errorMessage,
                        isLoading: false
                    });
                }
            }, inviteUserToChannel: async (channelId, userId) => {
                if (!channelId || !userId) return 'Missing channel or user ID';

                try {
                    const response = await fetch(`/api/channels/${channelId}/invite`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ userId })
                    });

                    if (!response.ok) {
                        const data = await response.json().catch(() => null);
                        throw new Error(data?.message || 'Failed to invite user');
                    }

                    const data = await response.json();

                    // Refresh channel details to update member list
                    get().fetchChannelDetails(channelId);

                    return null; // No error
                } catch (error) {
                    console.error('Error inviting user to channel:', error);
                    return error instanceof Error ? error.message : 'An error occurred';
                }
            },

            promoteToChannelOwner: async (channelId, userId) => {
                if (!channelId || !userId) return 'Missing channel or user ID';

                try {
                    const response = await fetch(`/api/channels/${channelId}/promote`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ userId })
                    });

                    if (!response.ok) {
                        const data = await response.json().catch(() => null);
                        throw new Error(data?.message || 'Failed to promote user');
                    }

                    const data = await response.json();

                    // Refresh channel details to update owner information
                    get().fetchChannelDetails(channelId);

                    return null; // No error
                } catch (error) {
                    console.error('Error promoting user to channel owner:', error);
                    return error instanceof Error ? error.message : 'An error occurred';
                }
            },

            makeChannelAdmin: async (channelId, userId) => {
                if (!channelId || !userId) return 'Missing channel or user ID';

                try {
                    const response = await fetch(`/api/channels/${channelId}/make-admin`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ userId })
                    });

                    if (!response.ok) {
                        const data = await response.json().catch(() => null);
                        throw new Error(data?.message || 'Failed to make user an admin');
                    }

                    const data = await response.json();

                    // Refresh channel details to update admin information
                    get().fetchChannelDetails(channelId);

                    return null; // No error
                } catch (error) {
                    console.error('Error making user a channel admin:', error);
                    return error instanceof Error ? error.message : 'An error occurred';
                }
            },

            updateLatestMessage: (channelId, message) => set((state) => ({
                channels: state.channels.map(c =>
                    c.id === channelId
                        ? { ...c, latestMessage: message }
                        : c
                ),
                activeChannel: state.activeChannel?.id === channelId
                    ? { ...state.activeChannel, latestMessage: message }
                    : state.activeChannel
            }))
        }),
        { name: 'channel-store' }
    )
);
