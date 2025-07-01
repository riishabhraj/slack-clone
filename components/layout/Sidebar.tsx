"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { User } from "@prisma/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, MessageSquare, Hash, Plus, UserCircle, Loader2, Lock } from "lucide-react";
import { useSession } from "next-auth/react";
import { SettingsDropdown } from "@/components/ui/SettingsDropdown";
import CreateChannelModal from "@/components/modals/CreateChannelModal";
import { useChannelStore } from "@/store/useChannelStore";

interface SidebarProps {
    className?: string;
    user?: User;
}

export function Sidebar({ className, user }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = useSession();
    const {
        channels,
        isLoading,
        fetchChannels,
        setActiveChannel
    } = useChannelStore();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Sidebar resizing state
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(256); // 256px = 64 * 4 (w-64)
    const maxWidth = 256; // Maximum width (current default)
    const minWidth = 60; // Minimum width

    // Use provided user prop or session data
    const currentUser = user || (session?.user as User | undefined);

    // Extract channelId from pathname if we're on a channel page
    useEffect(() => {
        const match = pathname.match(/\/channels\/(.+)$/);
        if (match && match[1]) {
            setActiveChannel(match[1]);
        }
    }, [pathname, setActiveChannel]);    // Fetch channels
    useEffect(() => {
        fetchChannels();
    }, [fetchChannels]);

    // Handle mouse down on resize handle
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    // Handle mouse move while resizing
    const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing || !sidebarRef.current) return;

        const sidebarRect = sidebarRef.current.getBoundingClientRect();
        const newWidth = e.clientX - sidebarRect.left;

        // Apply constraints: not larger than max, not smaller than min
        if (newWidth >= minWidth && newWidth <= maxWidth) {
            setSidebarWidth(newWidth);
        }
    };

    // Handle mouse up to stop resizing
    const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
    };

    // Clean up event listeners when component unmounts
    useEffect(() => {
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing]);

    const mainRoutes = [
        {
            label: "Home",
            href: "/",
            active: pathname === "/",
            icon: Home
        },
        {
            label: "Direct Messages",
            href: "/messages",
            active: pathname === "/messages" || pathname.startsWith("/messages/"),
            icon: MessageSquare
        }
    ]; return (
        <div
            ref={sidebarRef}
            className={cn(
                "flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border relative",
                isResizing ? "select-none" : "",
                className
            )}
            style={{ width: `${sidebarWidth}px` }}
        >
            {/* Resize handle */}
            <div
                className={cn(
                    "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 transition-colors",
                    isResizing ? "bg-blue-500" : "bg-transparent"
                )}
                onMouseDown={handleMouseDown}
            />

            <div className={cn("p-4 border-b border-sidebar-border", sidebarWidth < 200 ? "px-2" : "")}>
                <h1 className={cn("font-bold", sidebarWidth < 200 ? "text-lg" : "text-xl")}>
                    {sidebarWidth < 120 ? "SC" : "Slack Clone"}
                </h1>
                {user && sidebarWidth >= 180 && (
                    <div className="mt-2 text-sm text-sidebar-foreground/70">
                        Signed in as {user.name}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Main navigation */}                <nav className={cn("flex flex-col py-2", sidebarWidth < 200 ? "px-2" : "px-3")}>
                    {mainRoutes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "flex items-center rounded-md text-sm transition-colors mb-0.5",
                                sidebarWidth < 120 ? "justify-center py-2" : "px-2 py-1.5",
                                route.active
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                            )}
                            title={route.label}
                        >
                            <route.icon size={18} className={sidebarWidth < 120 ? "" : "mr-2"} />
                            {sidebarWidth >= 120 && route.label}
                        </Link>
                    ))}
                </nav>

                {/* Channels section */}                <div className="mt-4">
                    <div className={cn("flex items-center justify-between", sidebarWidth < 200 ? "px-2" : "px-3")}>
                        <h2 className={cn(
                            "uppercase font-semibold text-sidebar-foreground/70",
                            sidebarWidth < 120 ? "hidden" : "text-xs"
                        )}>
                            Channels
                        </h2>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="text-sidebar-foreground/70 hover:text-sidebar-foreground p-1 rounded-md hover:bg-sidebar-accent/50"
                            title="Create Channel"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 size={20} className="animate-spin text-sidebar-foreground/50" />
                        </div>
                    ) : (<nav className={cn("mt-1 flex flex-col", sidebarWidth < 200 ? "px-2" : "px-3")}>
                        {channels.length > 0 ? (
                            channels.map((channel) => (
                                <Link
                                    key={channel.id}
                                    href={`/channels/${channel.id}`}
                                    className={cn(
                                        "flex items-center rounded-md text-sm transition-colors mb-0.5",
                                        sidebarWidth < 120 ? "justify-center py-2" : "px-2 py-1.5",
                                        pathname === `/channels/${channel.id}`
                                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                                    )}
                                    title={channel.name}
                                >
                                    {channel.isPrivate ? (
                                        <Lock size={18} className={sidebarWidth < 120 ? "" : "mr-2 flex-shrink-0"} />
                                    ) : (
                                        <Hash size={18} className={sidebarWidth < 120 ? "" : "mr-2 flex-shrink-0"} />
                                    )}
                                    {sidebarWidth >= 120 && (
                                        <span className="truncate">
                                            {channel.name}
                                        </span>
                                    )}
                                </Link>
                            ))
                        ) : (
                            <div className="text-center py-3 text-sidebar-foreground/50 text-sm">
                                No channels yet
                            </div>
                        )}
                    </nav>
                    )}
                </div>
            </div>

            {/* User section */}            <div className={cn("border-t border-sidebar-border", sidebarWidth < 200 ? "p-2" : "p-3")}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        {currentUser?.image ? (
                            <img
                                src={currentUser.image}
                                alt={currentUser.name || "User"}
                                className="w-8 h-8 rounded-full"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center">
                                {currentUser?.name?.charAt(0) || <UserCircle size={16} />}
                            </div>
                        )}
                        {sidebarWidth >= 120 && (
                            <span className="ml-2 text-sm font-medium truncate max-w-[120px]">
                                {currentUser?.name || "User"}
                            </span>
                        )}
                        {sidebarWidth >= 200 && currentUser?.email && (
                            <span className="ml-1 text-xs text-sidebar-foreground/50 hidden sm:inline">
                                ({currentUser.email.split('@')[0]})
                            </span>
                        )}
                    </div>

                    {sidebarWidth >= 100 && (
                        <div>
                            <SettingsDropdown user={currentUser} />
                        </div>
                    )}
                </div>
            </div>

            {/* Create Channel Modal */}
            {isCreateModalOpen && (
                <CreateChannelModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                />
            )}
        </div>
    );
}
