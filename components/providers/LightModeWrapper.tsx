"use client";

import React from "react";
import "./LightModeWrapper.css";

/**
 * A wrapper component that forces content to be displayed in light mode
 * regardless of the user's theme settings
 */
export function LightModeWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="light bg-white text-black">
            {children}
        </div>
    );
}
