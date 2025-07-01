"use client";

import { Shell } from "@/components/layout/Shell";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { BookOpen, HelpCircle, MessageSquare, Video } from "lucide-react";
import Link from "next/link";

export default function HelpPage() {
    const { status } = useSession();

    // Redirect if not logged in
    if (status === "unauthenticated") {
        redirect("/login");
    }

    // Loading state
    if (status === "loading") {
        return (
            <Shell>
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            <div className="p-6 max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">Help & Feedback</h1>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-card rounded-lg shadow p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <BookOpen className="h-5 w-5 text-primary" />
                            <h2 className="text-xl font-semibold">Documentation</h2>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Learn how to use all the features of Slack Clone with our comprehensive documentation.
                        </p>
                        <Link
                            href="#"
                            className="inline-flex items-center text-sm text-primary hover:underline"
                        >
                            Browse documentation
                            <span className="ml-1">→</span>
                        </Link>
                    </div>

                    <div className="bg-card rounded-lg shadow p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Video className="h-5 w-5 text-primary" />
                            <h2 className="text-xl font-semibold">Video Tutorials</h2>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Watch step-by-step tutorials to get the most out of Slack Clone.
                        </p>
                        <Link
                            href="#"
                            className="inline-flex items-center text-sm text-primary hover:underline"
                        >
                            Watch tutorials
                            <span className="ml-1">→</span>
                        </Link>
                    </div>

                    <div className="bg-card rounded-lg shadow p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            <h2 className="text-xl font-semibold">Contact Support</h2>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Get help from our support team for any issues or questions.
                        </p>
                        <Link
                            href="#"
                            className="inline-flex items-center text-sm text-primary hover:underline"
                        >
                            Contact support
                            <span className="ml-1">→</span>
                        </Link>
                    </div>

                    <div className="bg-card rounded-lg shadow p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <HelpCircle className="h-5 w-5 text-primary" />
                            <h2 className="text-xl font-semibold">FAQs</h2>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Find answers to commonly asked questions about using Slack Clone.
                        </p>
                        <Link
                            href="#"
                            className="inline-flex items-center text-sm text-primary hover:underline"
                        >
                            View FAQs
                            <span className="ml-1">→</span>
                        </Link>
                    </div>
                </div>

                <div className="mt-8 bg-card rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Send Feedback</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        We're always looking to improve. Let us know what you think of Slack Clone or report any issues.
                    </p>
                    <form className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Feedback Type
                            </label>
                            <select className="w-full rounded-md border border-input bg-background px-3 py-2">
                                <option>Suggestion</option>
                                <option>Bug Report</option>
                                <option>Question</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Message
                            </label>
                            <textarea
                                className="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[100px]"
                                placeholder="Describe your feedback or issue..."
                            ></textarea>
                        </div>
                        <button
                            type="button"
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                        >
                            Submit Feedback
                        </button>
                    </form>
                </div>
            </div>
        </Shell>
    );
}
