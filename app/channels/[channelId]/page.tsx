"use client";

import { Shell } from "@/components/layout/Shell";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Hash, Users, Info, Loader2 } from "lucide-react";
import { useChannelStore } from "@/store/useChannelStore";
import { ChannelChat } from "@/components/chat/ChannelChat";

export default function ChannelPage() {
    const { channelId } = useParams() as { channelId: string };
    const { status } = useSession();
    const {
        activeChannel,
        isLoading,
        error,
        fetchChannelDetails,
        joinChannel
    } = useChannelStore();
    const [isJoining, setIsJoining] = useState(false);

    // Fetch channel data
    useEffect(() => {
        if (status !== "authenticated" || !channelId) return;
        fetchChannelDetails(channelId);
    }, [channelId, status, fetchChannelDetails]);

    // Handle joining a channel
    const handleJoinChannel = async () => {
        if (!channelId) return;

        setIsJoining(true);

        try {
            const response = await fetch(`/api/channels/${channelId}/join`, {
                method: "POST"
            });

            if (response.ok) {
                // Update the channel state using our Zustand store
                joinChannel(channelId);
            } else {
                throw new Error("Failed to join channel");
            }
        } catch (error) {
            console.error("Error joining channel:", error);
        } finally {
            setIsJoining(false);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <Shell>
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
            </Shell>
        );
    }

    // Error state
    if (error) {
        // Special handling for access denied errors
        if (error === 'ACCESS_DENIED') {
            return (
                <Shell>
                    <div className="flex flex-col items-center justify-center h-full p-4">
                        <div className="text-center max-w-md">
                            <Users className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Private Channel</h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                This is a private channel that you don't have access to.
                                You need an invitation from a channel member to join.
                            </p>
                        </div>
                    </div>
                </Shell>
            );
        }

        // Special handling for not found errors
        if (error === 'NOT_FOUND') {
            return (
                <Shell>
                    <div className="flex flex-col items-center justify-center h-full p-4">
                        <div className="text-center max-w-md">
                            <Info className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Channel Not Found</h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                The channel you're looking for doesn't exist or may have been deleted.
                            </p>
                        </div>
                    </div>
                </Shell>
            );
        }

        // Generic error state
        return (
            <Shell>
                <div className="flex flex-col items-center justify-center h-full p-4">
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-md max-w-md">
                        <h3 className="text-lg font-semibold mb-2">Error</h3>
                        <p>{error}</p>
                    </div>
                </div>
            </Shell>
        );
    }

    // No channel state
    if (!activeChannel) {
        return (
            <Shell>
                <div className="flex flex-col items-center justify-center h-full p-4">
                    <div className="text-center">
                        <h3 className="text-lg font-semibold mb-2">Channel not found</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            The channel you're looking for doesn't exist or you don't have access to it.
                        </p>
                    </div>
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            <div className="flex flex-col h-full max-h-full overflow-hidden">
                {/* Channel Content */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    {activeChannel.isMember ? (
                        <ChannelChat channelId={channelId} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <Info className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                            <h2 className="text-xl font-semibold mb-2">
                                Join #{activeChannel.name} to see messages
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 max-w-md">
                                You need to join this channel to see its content.
                            </p>
                            <button
                                onClick={handleJoinChannel}
                                disabled={isJoining}
                                className="px-4 py-2 mt-6 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
                            >
                                {isJoining ? "Joining..." : "Join Channel"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Shell>
    );
}
