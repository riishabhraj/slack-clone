import React from "react";

export default function VerifyLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="verify-container bg-white text-black min-h-screen">
            {children}
        </div>
    );
}
