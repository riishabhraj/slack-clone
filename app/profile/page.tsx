"use client";

import { Shell } from "@/components/layout/Shell";
import { useSession } from "next-auth/react";
import { User } from "@prisma/client";
import { redirect } from "next/navigation";

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const user = session?.user as User | undefined;

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
                <h1 className="text-2xl font-bold mb-6">Profile</h1>

                <div className="bg-card rounded-lg shadow p-6 mb-6">
                    <div className="flex items-center gap-4 mb-6">
                        {user?.image ? (
                            <img
                                src={user.image}
                                alt={user.name || "User"}
                                className="h-20 w-20 rounded-full"
                            />
                        ) : (
                            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                                {user?.name?.charAt(0) || "U"}
                            </div>
                        )}

                        <div>
                            <h2 className="text-xl font-semibold">{user?.name}</h2>
                            <p className="text-muted-foreground">{user?.email}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            This is a placeholder for your profile settings. Here you would be able to edit your personal information,
                            profile picture, notification preferences, and other account settings.
                        </p>
                    </div>
                </div>
            </div>
        </Shell>
    );
}
