import { LightModeWrapper } from "@/components/providers/LightModeWrapper";

export default function RegisterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <LightModeWrapper>{children}</LightModeWrapper>;
}
