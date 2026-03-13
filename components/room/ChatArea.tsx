"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MessageBubble } from "./MessageBubble";
import { useTranslation } from "@/hooks/useTranslation";
import type { MessageData } from "@/lib/api-client";

interface ChatAreaProps {
  messages: MessageData[];
  currentSessionId: string | null;
  onReply?: (message: MessageData) => void;
  typingUsers?: string[];
  onMarkRead?: (messageIds: string[]) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

export function ChatArea({ messages, currentSessionId, onReply, typingUsers = [], onMarkRead, onReact }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const [showScrollBadge, setShowScrollBadge] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevLengthRef = useRef(messages.length);
  const markedReadRef = useRef<Set<string>>(new Set());

  // Auto-scroll logic with unread badge
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;

    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setUnreadCount(0);
      setShowScrollBadge(false);
    } else if (messages.length > prevLengthRef.current) {
      // New messages came in while scrolled up
      const newCount = messages.length - prevLengthRef.current;
      setUnreadCount((prev) => prev + newCount);
      setShowScrollBadge(true);
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  // Track scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom) {
        setShowScrollBadge(false);
        setUnreadCount(0);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // IntersectionObserver for auto-marking messages as read
  useEffect(() => {
    if (!onMarkRead || !currentSessionId) return;
    const container = containerRef.current;
    if (!container) return;

    const pendingIds: string[] = [];
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      if (pendingIds.length > 0) {
        onMarkRead([...pendingIds]);
        pendingIds.forEach((id) => markedReadRef.current.add(id));
        pendingIds.length = 0;
      }
      flushTimer = null;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const msgId = (entry.target as HTMLElement).dataset.messageId;
            if (msgId && !markedReadRef.current.has(msgId)) {
              pendingIds.push(msgId);
              if (!flushTimer) {
                flushTimer = setTimeout(flush, 1000); // Batch reads every 1s
              }
            }
          }
        }
      },
      { root: container, threshold: 0.5 }
    );

    // Observe all message elements
    const elements = container.querySelectorAll("[data-message-id]");
    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      if (flushTimer) clearTimeout(flushTimer);
      flush();
    };
  }, [messages.length, onMarkRead, currentSessionId]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollBadge(false);
    setUnreadCount(0);
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600">
        <div className="text-center animate-[fadeIn_0.5s_ease-out]">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm">{t.chat.noMessages}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative min-h-0">
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-y-auto py-3 space-y-2 custom-scrollbar"
      >
        {messages.map((msg) => (
          <div key={msg.id} data-message-id={msg.type !== "system" ? msg.id : undefined}>
            <MessageBubble
              message={msg}
              isOwnMessage={msg.senderSessionId === currentSessionId}
              onReply={onReply}
              onReact={onReact}
              currentSessionId={currentSessionId}
            />
          </div>
        ))}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start px-4 animate-[slideUp_0.2s_ease-out]">
            <div className="bg-gray-800 border border-gray-700/50 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {typingUsers.join(", ")}{" "}
                  {typingUsers.length === 1 ? t.chat.typing : t.chat.typingMultiple}
                </span>
                <div className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                      style={{ animation: `pulse-dot 1.4s infinite ${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom badge */}
      {showScrollBadge && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-full text-xs font-medium shadow-lg transition-all cursor-pointer animate-[slideUp_0.2s_ease-out] flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          {unreadCount > 0 ? `${unreadCount} ${t.chat.newMessages}` : "↓"}
        </button>
      )}
    </div>
  );
}
