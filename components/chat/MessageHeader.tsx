'use client';

// Simple user type that matches what we get from the channel store
interface User {
    id: string;
    name: string | null;
    image: string | null;
    email?: string | null;
}
import { Hash, Info, UserPlus, Phone, Users, Video } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCallStore } from '@/store/useCallStore';

interface MessageHeaderProps {
    channelId: string;
    name: string;
    description?: string | null;
    memberCount?: number;
    isPrivate?: boolean;
    members?: User[];
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
    onShowDetails,
    onShowAddMembers
}: MessageHeaderProps) {
    const { data: session } = useSession();
    const { status, startCall } = useCallStore();
    const isInCall = status !== 'idle';

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

                {onShowAddMembers && (
                    <button
                        onClick={onShowAddMembers}
                        className="p-2 rounded-full hover:bg-muted transition"
                        aria-label="Add members"
                    >
                        <UserPlus className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
