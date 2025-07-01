import { LightModeWrapper } from "@/components/providers/LightModeWrapper";

export default function VerifyLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <LightModeWrapper>{children}</LightModeWrapper>;
}
