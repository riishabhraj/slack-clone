"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, LogOut, User, Moon, Sun, HelpCircle } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { User as UserType } from "@prisma/client";
import { useTheme } from "@/components/providers/ThemeProvider";

interface SettingsDropdownProps {
    user?: UserType;
}

export function SettingsDropdown({ user }: SettingsDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { theme, setTheme } = useTheme();

    // Close the dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Toggle theme function
    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    // Handle sign out with confirmation
    const handleSignOut = () => {
        if (confirm("Are you sure you want to sign out?")) {
            signOut({
                callbackUrl: '/login',
                redirect: true
            });
        }
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1.5 rounded-md hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
                aria-label="Settings"
            >
                <Settings size={18} />
            </button>

            {isOpen && (
                <div className="absolute bottom-full mb-2 left-0 w-56 rounded-md shadow-lg bg-sidebar border border-sidebar-border py-1 z-50">
                    {user && (
                        <div className="px-4 py-2 border-b border-sidebar-border">
                            <div className="flex items-center">
                                {user.image ? (
                                    <img src={user.image} alt={user.name || ""} className="h-8 w-8 rounded-full mr-2" />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center mr-2">
                                        {user.name?.charAt(0) || "U"}
                                    </div>
                                )}
                                <div>
                                    <div className="font-medium text-sidebar-foreground text-sm">{user.name}</div>
                                    {user.email && (
                                        <div className="text-xs text-sidebar-foreground/70 truncate max-w-[160px]">
                                            {user.email}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="py-1">
                        <Link
                            href="/profile"
                            className="flex items-center px-4 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50"
                            onClick={() => setIsOpen(false)}
                        >
                            <User size={16} className="mr-2" />
                            Profile
                        </Link>

                        <Link
                            href="/settings"
                            className="flex items-center px-4 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50"
                            onClick={() => setIsOpen(false)}
                        >
                            <Settings size={16} className="mr-2" />
                            Settings
                        </Link>

                        <button
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50"
                            onClick={() => {
                                toggleTheme();
                                setIsOpen(false);
                            }}
                        >
                            {theme === "dark" ? (
                                <>
                                    <Sun size={16} className="mr-2" />
                                    Light Mode
                                </>
                            ) : (
                                <>
                                    <Moon size={16} className="mr-2" />
                                    Dark Mode
                                </>
                            )}
                        </button>

                        <Link
                            href="/help"
                            className="flex items-center px-4 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50"
                            onClick={() => setIsOpen(false)}
                        >
                            <HelpCircle size={16} className="mr-2" />
                            Help & Feedback
                        </Link>
                    </div>

                    <div className="border-t border-sidebar-border py-1">
                        <button
                            onClick={handleSignOut}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-sidebar-accent/50"
                        >
                            <LogOut size={16} className="mr-2" />
                            Sign out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
