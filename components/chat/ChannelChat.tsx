"use client";

import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { MessageHeader } from "./MessageHeader";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useChannelStore } from "@/store/useChannelStore";

interface ChannelChatProps {
    channelId: string;
}

export function ChannelChat({ channelId }: ChannelChatProps) {
    const [inputHeight, setInputHeight] = useState(60); // Default input height estimate
    const { activeChannel } = useChannelStore();
    const [otherUsers, setOtherUsers] = useState<any[]>([]);
    const { data: session } = useSession(); // Move useSession call to the top level

    // Listen for input height changes
    const handleInputHeightChange = (height: number) => {
        setInputHeight(height);
    };

    // Extract users for direct messaging
    useEffect(() => {
        if (activeChannel?.members && activeChannel.members.length > 0 && session?.user?.id) {
            // Filter out the current user to get other users in the channel
            const currentUserId = session.user.id;
            const others = activeChannel.members.filter(member => member.id !== currentUserId);
            console.log(`Channel ${activeChannel.name} has ${others.length} other members besides current user`);
            setOtherUsers(others);
        }
    }, [activeChannel?.members, activeChannel?.name, session?.user?.id]);

    return (
        <div className="flex flex-col h-full max-h-full overflow-hidden">
            {/* Channel header with calling capabilities */}
            {activeChannel && (
                <MessageHeader
                    channelId={channelId}
                    name={activeChannel.name}
                    description={activeChannel.description}
                    memberCount={activeChannel.memberCount}
                    isPrivate={activeChannel.isPrivate}
                    members={otherUsers} // Always pass other users for call functionality
                />
            )}

            {/* Messages container as direct child with full scrollable area */}
            <MessageList
                channelId={channelId}
                className="flex-1 min-h-0"
                paddingBottom={inputHeight}
            />

            {/* Message input at the bottom - fixed at the bottom */}
            <div className="flex-shrink-0 bg-background border-t border-border shadow-sm z-10">
                <MessageInput
                    channelId={channelId}
                    onHeightChange={handleInputHeightChange}
                />
            </div>
        </div>
    );
}
