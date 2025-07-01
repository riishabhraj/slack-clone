"use client";

import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { User } from "@prisma/client";

interface MainProps {
    children: React.ReactNode;
    className?: string;
}

export function Main({ children, className }: MainProps) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const currentUser = session?.user as User | undefined;

    // Get the title based on the current path
    const getTitle = () => {
        if (pathname === "/") return "Home";
        if (pathname === "/messages") return "Direct Messages";
        if (pathname.startsWith("/channels/")) {
            const channelName = pathname.split("/").pop();
            return `#${channelName}`;
        }
        return "Slack Clone";
    };

    return (
        <main className={cn("flex-1 flex flex-col h-screen overflow-hidden bg-background text-foreground", className)}>
            {pathname !== "/" && (
                <div className="h-16 flex-shrink-0 border-b border-border px-6 flex items-center justify-between bg-background">
                    <h2 className="text-lg font-medium">{getTitle()}</h2>

                    {currentUser && (
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground hidden md:inline-block">
                                {currentUser.email}
                            </span>
                            {currentUser.image ? (
                                <img
                                    src={currentUser.image}
                                    alt={currentUser.name || ""}
                                    className="w-8 h-8 rounded-full"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-xs font-medium">
                                        {currentUser.name?.charAt(0) || "U"}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            <div className="flex-1 min-h-0 overflow-hidden">
                {children}
            </div>
        </main>
    );
}
