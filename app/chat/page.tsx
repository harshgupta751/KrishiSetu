/**
 * app/chat/page.tsx
 * AI Chat page — server component shell.
 * Delegates all interactivity to ChatInterface (client component).
 *
 * NOTE: The AppShell is NOT used here because the chat page has its own
 * full-height layout (sidebar + main). We use a stripped layout instead.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import AppShell from "@/components/layout/AppShell";
import ChatInterface from "@/components/chat/ChatInterface";

export const metadata: Metadata = {
  title: "AI Chat — KrishiSetu",
  description: "Talk to your AI-powered crop advisor",
};

export default function ChatPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="flex h-[calc(100dvh-4rem)] items-center justify-center -m-4 md:-m-6 lg:-m-8">
            <div className="flex items-center gap-2 text-cropwise-faint text-sm">
              <span className="w-2 h-2 rounded-full bg-cropwise-green-light animate-pulse" />
              Loading AI Chat...
            </div>
          </div>
        }
      >
        <ChatInterface />
      </Suspense>
    </AppShell>
  );
}