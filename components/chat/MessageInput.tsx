"use client";

import { useState, useRef, useEffect } from "react";
import { useMessageStore } from "@/store/useMessageStore";
import { Send, Loader2, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Define schema for message validation
const messageSchema = z.object({
    message: z.string().min(1, "Message cannot be empty")
});

type MessageFormValues = z.infer<typeof messageSchema>;

interface MessageInputProps {
    channelId: string;
    className?: string;
    onHeightChange?: (height: number) => void;
}

export function MessageInput({ channelId, className, onHeightChange }: MessageInputProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { data: session } = useSession();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const { sendMessage } = useMessageStore();
    const { isConnected, emitMessage, sendTyping, sendStopTyping } = useSocket();
    const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

    // Set up form with zod validation
    const form = useForm<MessageFormValues>({
        resolver: zodResolver(messageSchema),
        defaultValues: {
            message: ''
        }
    });

    const messageValue = form.watch('message');    // Auto focus input when component mounts and report initial height
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();

            // Report initial height if callback is provided
            if (onHeightChange && formRef.current) {
                // Use setTimeout to ensure the form has rendered completely
                setTimeout(() => {
                    if (formRef.current) {
                        onHeightChange(formRef.current.offsetHeight);
                    }
                }, 100);
            }
        }
    }, [onHeightChange]);    // Handle message submission
    const onSubmit = async (data: MessageFormValues) => {
        const trimmedMessage = data.message.trim();
        if (!trimmedMessage || isSubmitting) return;

        setIsSubmitting(true);

        try {
            // First clear the form immediately for better UX
            form.reset({ message: '' });

            // Try to send via socket for real-time (doesn't wait for response)
            if (isConnected) {
                // Signal that we're no longer typing
                sendStopTyping(channelId);

                // Emit message via socket
                emitMessage(channelId, trimmedMessage);

                // Still send via API for persistence and in case socket fails
                await sendMessage(trimmedMessage, channelId);
            } else {
                // Fallback to just API if socket isn't connected
                await sendMessage(trimmedMessage, channelId);
            }
        } catch (error) {
            // Error already handled in the store
            console.error("Failed to send message");
        } finally {
            setIsSubmitting(false);
            // Refocus the input after submission
            if (textareaRef.current) {
                textareaRef.current.focus();
            }
        }
    };

    // Handle Enter key for submission (Shift+Enter for new line)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            form.handleSubmit(onSubmit)();
        }
    };    // Auto-resize textarea as user types and handle typing indicator
    useEffect(() => {
        // Auto-resize the textarea
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;

            // Notify parent component of height change if callback is provided
            if (onHeightChange && formRef.current) {
                onHeightChange(formRef.current.offsetHeight);
            }
        }

        // Handle typing indicators
        if (messageValue && isConnected) {
            // Send typing event
            sendTyping(channelId);

            // Clear previous timeout
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }

            // Set new timeout to stop typing indicator after 3 seconds of inactivity
            const timeout = setTimeout(() => {
                sendStopTyping(channelId);
            }, 3000);

            setTypingTimeout(timeout);
        }

        return () => {
            // Clean up timeout on unmount or when message changes
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }
        };
    }, [messageValue, isConnected, channelId, sendTyping, sendStopTyping, typingTimeout, onHeightChange]);

    if (!session?.user) return null;

    return (
        <Form {...form}>
            <form
                ref={formRef}
                onSubmit={form.handleSubmit(onSubmit)}
                className={cn("py-2 px-4", className)}>
                <div className="relative">
                    <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <div className="relative">
                                        <Textarea
                                            {...field}
                                            ref={(e) => {
                                                field.ref(e);
                                                textareaRef.current = e;
                                            }}
                                            placeholder={`Message #${channelId}`}
                                            className="resize-none pr-12 min-h-[44px] max-h-[50vh] overflow-y-auto rounded-md"
                                            onKeyDown={handleKeyDown}
                                            disabled={isSubmitting}
                                        />                                        <div className="absolute right-2 bottom-2 flex items-center">
                                            {/* Connection indicator */}
                                            <span className="mr-2" title={isConnected ? "Real-time connected" : "Offline mode"}>
                                                {isConnected ? (
                                                    <Wifi className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <WifiOff className="h-4 w-4 text-amber-500" />
                                                )}
                                            </span>

                                            <Button
                                                size="icon"
                                                type="submit"
                                                disabled={!messageValue?.trim() || isSubmitting}
                                                className="h-8 w-8"
                                                variant="ghost"
                                                aria-label="Send message"
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Send className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>
            </form>
        </Form>
    );
}
