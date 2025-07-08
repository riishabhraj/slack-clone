import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { RealTimeProvider } from "@/components/providers/RealTimeProvider";
import { CallBroadcastManager } from "@/components/call/CallBroadcastManager";
import { CallSocket } from "@/components/call/CallSocket";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Slack Clone",
  description: "A modern Slack clone built with Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider defaultTheme="system" storageKey="slack-clone-theme">
          <SessionProvider>
            <RealTimeProvider>
              <CallBroadcastManager />
              <CallSocket />
              {children}
            </RealTimeProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
