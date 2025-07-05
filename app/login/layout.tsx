import React from "react";

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="login-container bg-white text-black min-h-screen">
            {children}
        </div>
    );
}