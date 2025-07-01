"use client";

import { cn } from "@/lib/utils";

export function MessageSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("flex flex-col space-y-4", className)}>
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={cn(
                    "flex items-start gap-2 animate-pulse",
                    i % 2 === 0 ? "mr-12" : "ml-12"
                )}>
                    <div className="h-8 w-8 bg-muted rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-32" />
                        <div className="h-16 bg-muted rounded" />
                    </div>
                </div>
            ))}
        </div>
    );
}
