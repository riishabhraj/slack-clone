"use client";

import { Shell } from "@/components/layout/Shell";
import { useSession } from "next-auth/react";
import { User } from "@prisma/client";
import { redirect } from "next/navigation";
import { Bell, Globe, Lock, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const user = session?.user as User | undefined;
    const { theme, setTheme } = useTheme();

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
                <h1 className="text-2xl font-bold mb-6">Settings</h1>

                <div className="space-y-6">
                    <div className="bg-card rounded-lg shadow p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Lock className="h-5 w-5 text-primary" />
                            <h2 className="text-xl font-semibold">Account Settings</h2>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Manage your account security preferences. Here you would be able to
                            change your password, enable two-factor authentication, and manage your connected accounts.
                        </p>
                    </div>

                    <div className="bg-card rounded-lg shadow p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Bell className="h-5 w-5 text-primary" />
                            <h2 className="text-xl font-semibold">Notification Settings</h2>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Control when and how you receive notifications from Slack Clone.
                            Customize notifications for channels, direct messages, mentions, and more.
                        </p>
                    </div>

                    <div className="bg-card rounded-lg shadow p-6">
                        <div className="flex items-center gap-3 mb-4">
                            {theme === "dark" ? (
                                <Moon className="h-5 w-5 text-primary" />
                            ) : (
                                <Sun className="h-5 w-5 text-primary" />
                            )}
                            <h2 className="text-xl font-semibold">Appearance</h2>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Customize the look and feel of your Slack Clone. Toggle between light and dark themes
                            to suit your preferences and working environment.
                        </p>
                        <div className="flex items-center gap-3 mt-4">
                            <button
                                onClick={() => setTheme("light")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${theme === "light"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-background hover:bg-muted"
                                    }`}
                            >
                                <Sun size={16} />
                                Light Mode
                            </button>
                            <button
                                onClick={() => setTheme("dark")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${theme === "dark"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-background hover:bg-muted"
                                    }`}
                            >
                                <Moon size={16} />
                                Dark Mode
                            </button>
                            <button
                                onClick={() => setTheme("system")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${theme === "system"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-background hover:bg-muted"
                                    }`}
                            >
                                System Preference
                            </button>
                        </div>
                    </div>

                    <div className="bg-card rounded-lg shadow p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Globe className="h-5 w-5 text-primary" />
                            <h2 className="text-xl font-semibold">Language & Region</h2>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Set your preferred language and regional settings.
                            This is a placeholder for language selection options.
                        </p>
                    </div>
                </div>
            </div>
        </Shell>
    );
}
