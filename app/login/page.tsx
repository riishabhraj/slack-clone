"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

function LoginContent() {
    const router = useRouter();
    const { status } = useSession();
    const searchParams = useSearchParams();
    const verified = searchParams.get("verified") === "true";

    useEffect(() => {
        if (status === "authenticated") {
            router.push("/");
        }
    }, [status, router]);

    // Using key with the verified param ensures the form re-renders when coming from verification
    return <LoginForm key={`login-form-${verified ? 'verified' : 'normal'}`} />;
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}