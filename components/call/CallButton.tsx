'use client';

import { useState } from 'react';
import { Phone, Video, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCallStore } from '@/store/useCallStore';
import { cn } from '@/lib/utils';

interface CallButtonProps {
    channelId: string;
    receiverId: string;
    receiverName: string | null;
    receiverImage: string | null;
    className?: string;
}

export function CallButton({
    channelId,
    receiverId,
    receiverName,
    receiverImage,
    className
}: CallButtonProps) {
    const { data: session } = useSession();
    const { status, startCall } = useCallStore();
    const [isLoading, setIsLoading] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    // Don't show call buttons for the current user
    if (!session?.user || session.user.id === receiverId) {
        return null;
    }

    // Don't allow starting a call while already in one
    const isInCall = status !== 'idle';

    // Handle starting a call
    const handleStartCall = async (callType: 'audio' | 'video') => {
        if (isInCall || !session?.user) return;

        setIsLoading(true);
        setMenuOpen(false);

        try {
            await startCall(
                callType,
                channelId,
                {
                    id: receiverId,
                    name: receiverName,
                    image: receiverImage
                }
            );
        } catch (error) {
            console.error('Failed to start call:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setMenuOpen(!menuOpen)}
                disabled={isLoading || isInCall}
                className={cn(
                    "p-2 rounded-full hover:bg-muted transition",
                    (isLoading || isInCall) && "opacity-50 cursor-not-allowed",
                    className
                )}
                aria-label="Call options"
            >
                {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Phone className="h-4 w-4" />
                )}
            </button>

            {menuOpen && (
                <div className="absolute top-full right-0 mt-2 p-2 bg-card rounded-md border border-border shadow-md z-50 flex flex-col gap-1">
                    <button
                        onClick={() => handleStartCall('audio')}
                        className="px-3 py-2 flex items-center gap-2 hover:bg-muted rounded-sm"
                    >
                        <Phone className="h-4 w-4" />
                        <span>Audio call</span>
                    </button>
                    <button
                        onClick={() => handleStartCall('video')}
                        className="px-3 py-2 flex items-center gap-2 hover:bg-muted rounded-sm"
                    >
                        <Video className="h-4 w-4" />
                        <span>Video call</span>
                    </button>
                </div>
            )}
        </div>
    );
}
