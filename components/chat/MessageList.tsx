"use client";

import { useEffect, useRef, useState, Fragment, useCallback } from "react";
import { useMessageStore } from "@/store/useMessageStore";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Loader2, MessageCircleMore, ChevronUp, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealTime } from "@/components/providers/RealTimeProvider";
import { MessageSkeleton } from "./MessageSkeleton";
import { Button } from "@/components/ui/button";

interface MessageListProps {
    channelId: string;
    className?: string;
    paddingBottom?: number;
}

export function MessageList({ channelId, className, paddingBottom = 0 }: MessageListProps) {
    const { data: session } = useSession();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);
    const [showScrollTopButton, setShowScrollTopButton] = useState(false);
    const [messageCount, setMessageCount] = useState(0);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const { isConnected, typingUsers } = useRealTime();
    const {
        messages,
        isLoading,
        error,
        hasMore,
        fetchMessages,
        loadMoreMessages,
        reset
    } = useMessageStore();

    // Get typing users for this channel
    const channelTypingUsers = typingUsers[channelId] || [];

    // Load messages when component mounts or channelId changes
    useEffect(() => {
        if (channelId) {
            reset(); // Clear previous messages
            fetchMessages(channelId);
        }

        return () => {
            // Clean up when component unmounts
            reset();
        };
    }, [channelId, fetchMessages, reset]);    // Improved scroll-to-bottom behavior with auto-scrolling for new messages
    useEffect(() => {
        // Get container element
        const container = messagesEndRef.current?.parentElement?.parentElement;

        if (messagesEndRef.current && messages.length > 0 && container) {
            // Check if we're already near the bottom before scrolling
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

            // Only auto-scroll if we were already at the bottom or this is initial load (!hasMore)
            if (isNearBottom || !hasMore) {
                messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
            }
        }
    }, [messages, hasMore]);

    // Track when new messages arrive and user is scrolled up
    useEffect(() => {
        if (messages.length > messageCount) {
            // Get container element
            const container = containerRef.current;

            if (container) {
                // Check if we're not at the bottom
                const isScrolledUp = container.scrollHeight - container.scrollTop - container.clientHeight > 100;

                // If scrolled up, show the new message indicator
                if (isScrolledUp && messageCount > 0) {
                    setShowNewMessageIndicator(true);
                }
            }

            // Update message count
            setMessageCount(messages.length);
        }
    }, [messages.length, messageCount]);

    // Handle scrolling to bottom when button is clicked
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
            setShowNewMessageIndicator(false);
        }
    };

    // Enhanced scroll handler for both directions
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        const { scrollTop, scrollHeight, clientHeight } = container;

        // Show scroll top button when scrolled down enough
        setShowScrollTopButton(scrollTop > 500);

        // Load more messages when user scrolls near the top
        if (scrollTop < 100 && hasMore && !isLoading) {
            loadMoreMessages(channelId);
        }

        // Check if user is at bottom (for new message handling)
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
        setIsAtBottom(isNearBottom);

        // If scrolled up and we have new messages, show the indicator
        if (!isNearBottom && messageCount > 0 && messages.length > messageCount) {
            setShowNewMessageIndicator(true);
        } else if (isNearBottom) {
            setShowNewMessageIndicator(false);
        }
    }, [channelId, hasMore, isLoading, loadMoreMessages, messageCount, messages.length]);



    // Show loading state
    if (isLoading && messages.length === 0) {
        return (
            <div className="flex flex-col h-full p-4">
                <MessageSkeleton />
            </div>
        );
    }

    // Show error state
    if (error && messages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4">
                <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-md">
                    <h3 className="text-lg font-semibold mb-2">Error</h3>
                    <p>{error}</p>
                </div>
            </div>
        );
    } const scrollToTop = () => {
        if (containerRef.current) {
            containerRef.current.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            setShowScrollTopButton(false);
        }
    };

    return (
        <div
            className={cn(
                "overflow-y-auto px-6 py-4",
                "h-full",
                "scrollbar-gutter-stable",
                "[&::-webkit-scrollbar]:w-3",
                "[&::-webkit-scrollbar]:visible",
                "[&::-webkit-scrollbar-thumb]:rounded-full",
                "[&::-webkit-scrollbar-thumb]:bg-gray-300 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400",
                "dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-500",
                "[&::-webkit-scrollbar-track]:bg-transparent",
                "hover:[&::-webkit-scrollbar-track]:bg-gray-100",
                "dark:hover:[&::-webkit-scrollbar-track]:bg-gray-800",
                className
            )}
            style={paddingBottom > 0 ? { paddingBottom: `${paddingBottom}px` } : undefined}
            onScroll={handleScroll}
            ref={containerRef}
        >
            {/* Show loading indicator when loading more messages */}
            {isLoading && messages.length > 0 && (
                <div className="flex justify-center py-2">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            )}

            {/* New message indicator */}
            {showNewMessageIndicator && (
                <div className="sticky bottom-4 flex justify-center">
                    <button
                        onClick={scrollToBottom}
                        className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs flex items-center gap-1 shadow-md hover:bg-primary/90 transition-colors"
                    >
                        <span>New messages</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                    </button>
                </div>
            )}

            {/* No messages state */}
            {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-muted-foreground">
                        No messages yet. Be the first to send a message!
                    </p>
                </div>
            )}            {/* Messages list */}
            <div className="flex flex-col space-y-4 min-h-0">
                {messages.map((message, index) => {
                    // Check if we need to show a date separator
                    let showDateSeparator = false;
                    const messageDate = new Date(message.createdAt);

                    if (index === 0) {
                        // Always show date separator for first message
                        showDateSeparator = true;
                    } else {
                        // Check if the date is different from previous message
                        const prevMessageDate = new Date(messages[index - 1].createdAt);
                        showDateSeparator = messageDate.toDateString() !== prevMessageDate.toDateString();
                    }

                    // Format the dates
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(today.getDate() - 1);

                    const isToday = messageDate.toDateString() === today.toDateString();
                    const isYesterday = messageDate.toDateString() === yesterday.toDateString();

                    // Time and date formatting
                    const formattedDate = isToday
                        ? format(messageDate, 'h:mm a')
                        : format(messageDate, 'MMM d, h:mm a');

                    const separatorDate = isToday
                        ? 'Today'
                        : isYesterday
                            ? 'Yesterday'
                            : format(messageDate, 'EEEE, MMMM d, yyyy');

                    const isCurrentUser = message.user.id === session?.user?.id; return (
                        <Fragment key={message.id}>
                            {showDateSeparator && (
                                <div className="flex items-center justify-center my-4">
                                    <div className="bg-muted px-2 py-1 rounded-md text-xs text-muted-foreground">
                                        {separatorDate}
                                    </div>
                                </div>
                            )}
                            <div className={cn(
                                "flex items-start space-x-2",
                                isCurrentUser ? "justify-end" : "justify-start"
                            )}>
                                {!isCurrentUser && (
                                    <div className="flex-shrink-0">
                                        {message.user.image ? (
                                            <img
                                                src={message.user.image}
                                                alt={message.user.name || "User"}
                                                className="h-8 w-8 rounded-full"
                                            />
                                        ) : (
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <span className="text-xs font-medium text-primary">
                                                    {message.user.name?.charAt(0) || "U"}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className={cn(
                                    "max-w-md",
                                    isCurrentUser ? "order-first mr-2" : "order-last"
                                )}>
                                    {!isCurrentUser && (
                                        <div className="flex items-center mb-1">
                                            <span className="text-sm font-medium">{message.user.name || "Unknown"}</span>
                                            <span className="text-xs text-muted-foreground ml-2">{formattedDate}</span>
                                        </div>
                                    )}                                <div className={cn(
                                        "rounded-md p-3 shadow-sm",
                                        isCurrentUser
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted"
                                    )}>
                                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                    </div>

                                    {isCurrentUser && (<div className="flex justify-end mt-1">
                                        <span className="text-xs text-muted-foreground">{formattedDate}</span>
                                    </div>
                                    )}
                                </div>
                            </div>
                        </Fragment>
                    );
                })}

                {/* Typing indicators */}
                {channelTypingUsers.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 animate-pulse">
                        <MessageCircleMore className="h-4 w-4" />
                        <span>
                            {channelTypingUsers.length === 1
                                ? `${channelTypingUsers[0].userName || 'Someone'} is typing...`
                                : `${channelTypingUsers.length} people are typing...`}
                        </span>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* We already have a new message indicator above, so this is redundant */}

            {/* Scroll to top button */}
            {showScrollTopButton && (
                <div className="sticky top-4 flex justify-center z-10">
                    <Button
                        onClick={scrollToTop}
                        className="rounded-full bg-primary shadow-lg p-2 w-10 h-10"
                        size="sm"
                    >
                        <ChevronUp className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
