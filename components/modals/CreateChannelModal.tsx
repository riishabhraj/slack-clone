"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useChannelStore } from "@/store/useChannelStore";

interface CreateChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreateChannelModal({ isOpen, onClose }: CreateChannelModalProps) {
    const router = useRouter();
    const { addChannel } = useChannelStore();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!name.trim()) {
            setError("Channel name is required");
            return;
        }

        // Reset error
        setError("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/channels", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim(),
                    isPrivate
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to create channel");
            }

            const channel = await response.json();

            // Add channel to store
            addChannel(channel);

            // Close the modal
            onClose();

            // Reset form
            setName("");
            setDescription("");
            setIsPrivate(false);

            // Navigate to the new channel
            router.push(`/channels/${channel.id}`);
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError("An unexpected error occurred");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md shadow-lg">
                <div className="flex items-center justify-between border-b p-4">
                    <h2 className="text-xl font-semibold">Create a Channel</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="name" className="block text-sm font-medium mb-1">
                            Channel Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="e.g. marketing"
                            required
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Lowercase letters, numbers, and hyphens only. No spaces.
                        </p>
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium mb-1">
                            Description <span className="text-gray-400">(optional)</span>
                        </label>
                        <input
                            id="description"
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="What's this channel about?"
                        />
                    </div>

                    <div className="flex items-center">
                        <input
                            id="isPrivate"
                            type="checkbox"
                            checked={isPrivate}
                            onChange={(e) => setIsPrivate(e.target.checked)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="isPrivate" className="ml-2 block text-sm">
                            Make private
                        </label>
                    </div>

                    {isPrivate && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                            Private channels are only visible to their members.
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
                            disabled={isLoading}
                        >
                            {isLoading ? "Creating..." : "Create Channel"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
