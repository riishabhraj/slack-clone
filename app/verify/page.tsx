"use client";

import { Suspense } from "react";
import VerifyForm from "@/components/auth/VerifyForm";

function VerifyContent() {
    console.log("I am here");
    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-12 bg-gray-50">
            <div className="w-full max-w-md space-y-8 px-4">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold text-gray-900">
                        Verify your account
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Please enter the verification code sent to your email
                    </p>
                </div>

                <VerifyForm />
            </div>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
            <VerifyContent />
        </Suspense>
    );
}
