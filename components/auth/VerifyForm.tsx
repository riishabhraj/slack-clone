import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

const verifyFormSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    otp: z.string().length(6, { message: "OTP must be 6 digits" }),
});

type VerifyFormData = z.infer<typeof verifyFormSchema>;

export default function VerifyForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email") || "";
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [resendTimeout, setResendTimeout] = useState(60);
    const [showResendButton, setShowResendButton] = useState(false);
    const [verificationSuccess, setVerificationSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<VerifyFormData>({
        resolver: zodResolver(verifyFormSchema),
        defaultValues: {
            email,
            otp: "",
        },
    });

    useEffect(() => {
        if (email) {
            setValue("email", email);
        }

        // Set up timer for resend button
        let timer: NodeJS.Timeout;
        if (resendTimeout > 0 && !verificationSuccess) {
            timer = setInterval(() => {
                setResendTimeout((prev) => {
                    if (prev <= 1) {
                        setShowResendButton(true);
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timer) clearInterval(timer);
        };
    }, [email, setValue, resendTimeout, verificationSuccess]);

    const onSubmit = async (data: VerifyFormData) => {
        try {
            setIsLoading(true);
            setError("");

            const response = await fetch("/api/verify-otp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (response.ok) {
                if (result.isVerified) {
                    // Show success message instead of immediate redirect
                    setVerificationSuccess(true);
                }
            } else {
                setError(result.message || "Verification failed");
            }
        } catch (err) {
            console.error("Verification error:", err);
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        try {
            setIsLoading(true);
            setError("");
            setShowResendButton(false);

            const response = await fetch("/api/resend-otp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            const result = await response.json();

            if (response.ok) {
                setResendTimeout(60);
            } else {
                setError(result.message || "Failed to resend verification code");
                setShowResendButton(true);
            }
        } catch (err) {
            console.error("Resend error:", err);
            setError("Failed to resend verification code");
            setShowResendButton(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-8 bg-white py-8 px-4 shadow rounded-lg sm:px-10">
            {verificationSuccess ? (
                <div className="text-center space-y-6">
                    <div className="flex items-center justify-center">
                        <div className="rounded-full bg-green-100 p-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800">Account Verified Successfully!</h3>
                        <p className="mt-2 text-gray-600">Your account has been verified. You can now login to access your account.</p>
                    </div>
                    <div className="mt-6">
                        <Link
                            href="/login?verified=true"
                            className="w-full inline-flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                        >
                            Go to Login
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                        {error && (
                            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
                                <p>{error}</p>
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Email
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    type="email"
                                    readOnly
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 bg-gray-100 text-gray-700 focus:outline-none caret-gray-700"
                                    {...register("email")}
                                />
                                {errors.email && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="otp"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Verification Code
                            </label>
                            <div className="mt-1">
                                <input
                                    id="otp"
                                    type="text"
                                    placeholder="6-digit code"
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 caret-gray-900"
                                    {...register("otp")}
                                    maxLength={6}
                                    autoFocus
                                />
                                {errors.otp && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.otp.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {isLoading ? "Verifying..." : "Verify Account"}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        {showResendButton ? (
                            <button
                                onClick={handleResend}
                                disabled={isLoading}
                                className="text-indigo-600 hover:text-indigo-500 text-sm"
                            >
                                Resend verification code
                            </button>
                        ) : (
                            <p className="text-gray-500 text-sm">
                                Resend code in {resendTimeout} seconds
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
