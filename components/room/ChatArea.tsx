"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { useTranslation } from "@/hooks/useTranslation";
import type { MessageData } from "@/lib/api-client";

interface ChatAreaProps {
  messages: MessageData[];
  currentSessionId: string | null;
}

export function ChatArea({ messages, currentSessionId }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm">{t.chat.noMessages}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-3 space-y-2">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isOwnMessage={msg.senderSessionId === currentSessionId}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
