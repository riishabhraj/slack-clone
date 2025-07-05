import React from "react";

export default function RegisterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="register-container bg-white text-black min-h-screen">
            {children}
        </div>
    );
}
