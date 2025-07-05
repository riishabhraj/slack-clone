'use client';

// Simple user type that matches what we get from the channel store
interface User {
    id: string;
    name: string | null;
    image: string | null;
    email?: string | null;
}
import { useState } from 'react';
import { Hash, Info, UserPlus, Phone, Users, Video, Shield, CrownIcon } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCallStore } from '@/store/useCallStore';
import { useChannelStore } from '@/store/useChannelStore';
import { ChannelMembers } from '@/components/channel/ChannelMembers';

interface MessageHeaderProps {
    channelId: string;
    name: string;
    description?: string | null;
    memberCount?: number;
    isPrivate?: boolean;
    members?: User[];
    admins?: User[];
    ownerId?: string;
    onShowDetails?: () => void;
    onShowAddMembers?: () => void;
}

export function MessageHeader({
    channelId,
    name,
    description,
    memberCount,
    isPrivate,
    members,
    admins,
    ownerId,
    onShowDetails,
    onShowAddMembers
}: MessageHeaderProps) {
    const { data: session } = useSession();
    const { status, startCall } = useCallStore();
    const { activeChannel } = useChannelStore();
    const isInCall = status !== 'idle';
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    // Check user permissions
    const isCurrentUserOwner = session?.user?.id === ownerId || session?.user?.id === activeChannel?.ownerId;
    const isCurrentUserAdmin = admins?.some(admin => admin.id === session?.user?.id) || isCurrentUserOwner ||
        activeChannel?.admins?.some(admin => admin.id === session?.user?.id);

    // Find the first other member (not current user) for call
    const otherMembers = (members || []).filter(m => m.id !== session?.user?.id);
    const firstOther = otherMembers[0];

    // Handlers for audio/video call
    const handleAudioCall = async () => {
        if (!firstOther || isInCall) return;
        await startCall('audio', channelId, {
            id: firstOther.id,
            name: firstOther.name,
            image: firstOther.image
        });
    };
    const handleVideoCall = async () => {
        if (!firstOther || isInCall) return;
        await startCall('video', channelId, {
            id: firstOther.id,
            name: firstOther.name,
            image: firstOther.image
        });
    };

    return (
        <div className="flex items-center justify-between p-4 border-b border-border bg-background sticky top-0 z-10">
            <div className="flex items-center">
                <div className="mr-3">
                    <Hash className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                    <h2 className="text-lg font-medium">{name}</h2>
                    {description && (
                        <p className="text-sm text-muted-foreground truncate max-w-md">{description}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center space-x-2">
                {memberCount !== undefined && (
                    <span className="flex items-center text-sm text-muted-foreground">
                        <Users className="h-4 w-4 mr-1" />
                        {memberCount}
                    </span>
                )}
                {/* Audio and Video Call Buttons */}
                {otherMembers.length > 0 && (
                    <>
                        <button
                            onClick={handleAudioCall}
                            disabled={isInCall}
                            className="p-2 rounded-full hover:bg-muted transition"
                            aria-label="Start audio call"
                        >
                            <Phone className="h-4 w-4" />
                        </button>
                        <button
                            onClick={handleVideoCall}
                            disabled={isInCall}
                            className="p-2 rounded-full hover:bg-muted transition"
                            aria-label="Start video call"
                        >
                            <Video className="h-4 w-4" />
                        </button>
                    </>
                )}

                {onShowDetails && (
                    <button
                        onClick={onShowDetails}
                        className="p-2 rounded-full hover:bg-muted transition"
                        aria-label="View channel details"
                    >
                        <Info className="h-4 w-4" />
                    </button>
                )}

                {/* Show the invite button for channels */}
                <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="p-2 rounded-full hover:bg-muted transition"
                    aria-label="Manage channel members"
                >
                    <UserPlus className="h-4 w-4" />
                </button>
            </div>

            {/* Channel Members component for invitations and management */}
            {isInviteModalOpen && (
                <ChannelMembers
                    channelId={channelId}
                    onClose={() => setIsInviteModalOpen(false)}
                />
            )}
        </div>
    );
}
