"use client";

import { Sidebar } from "./Sidebar";
import { Main } from "./Main";
import { User } from "@prisma/client";
import { useSession } from "next-auth/react";

interface ShellProps {
    children: React.ReactNode;
    user?: User;
}

export function Shell({ children, user }: ShellProps) {
    // You can use session data if needed
    const { data: session } = useSession();

    // Use session user data if no user prop is provided
    const currentUser = user || (session?.user as User | undefined);

    return (
        <div className="h-screen flex bg-background">
            <Sidebar user={currentUser} />
            <Main>{children}</Main>
        </div>
    );
}
