'use client';

import { Shell } from "@/components/layout/Shell";
import { MessageSquare, Users, Plus, Smile, Hash, Lock } from "lucide-react";
import { useEffect } from "react";
import { useChannelStore } from "@/store/useChannelStore";
import Link from "next/link";

export default function Home() {
  const { channels, fetchChannels, isLoading } = useChannelStore();

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  return (
    <Shell>
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        <h1 className="text-3xl font-bold mb-8 mt-4">Welcome to Slack Clone</h1>

        {/* Feature overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card text-card-foreground p-6 rounded-lg border border-border shadow-sm">
            <div className="flex items-center mb-4 text-primary">
              <MessageSquare className="mr-2" size={20} />
              <h2 className="text-xl font-semibold">Messaging</h2>
            </div>
            <p className="text-muted-foreground">
              Communicate with your team in real-time. Share messages, files, and collaborate seamlessly.
            </p>
          </div>

          <div className="bg-card text-card-foreground p-6 rounded-lg border border-border shadow-sm">
            <div className="flex items-center mb-4 text-primary">
              <Users className="mr-2" size={20} />
              <h2 className="text-xl font-semibold">Channels</h2>
            </div>
            <p className="text-muted-foreground">
              Organize conversations by topics in channels. Keep discussions focused and productive.
            </p>
          </div>

          <div className="bg-card text-card-foreground p-6 rounded-lg border border-border shadow-sm">
            <div className="flex items-center mb-4 text-primary">
              <Plus className="mr-2" size={20} />
              <h2 className="text-xl font-semibold">Create</h2>
            </div>
            <p className="text-muted-foreground">
              Create new channels for projects, teams, or interests. Invite members and start collaborating.
            </p>
          </div>

          <div className="bg-card text-card-foreground p-6 rounded-lg border border-border shadow-sm">
            <div className="flex items-center mb-4 text-primary">
              <Smile className="mr-2" size={20} />
              <h2 className="text-xl font-semibold">Express</h2>
            </div>
            <p className="text-muted-foreground">
              React to messages with emojis, thread replies, and share rich content from anywhere.
            </p>
          </div>
        </div>

        {/* Getting started */}
        <div className="bg-card text-card-foreground p-6 rounded-lg border border-border shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
          <p className="mb-4 text-muted-foreground">
            This is a modern Slack clone built with Next.js, Prisma, and NextAuth.js. Here's how to get started:
          </p>
          <ul className="space-y-3 text-foreground">
            <li className="flex items-start">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">1</span>
              <span>Browse channels in the sidebar and join conversations</span>
            </li>
            <li className="flex items-start">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">2</span>
              <span>Start direct messages with team members</span>
            </li>
            <li className="flex items-start">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">3</span>
              <span>Create new channels for specific team discussions</span>
            </li>
            <li className="flex items-start">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">4</span>
              <span>Customize your profile and preferences in settings</span>
            </li>
          </ul>
        </div>
      </div>
    </Shell>
  );
}
