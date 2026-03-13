"use client";

import { useState, useEffect, useCallback } from "react";
import type { MessageData } from "@/lib/api-client";
import { getFileDownloadUrl } from "@/lib/api-client";
import { getSession } from "@/lib/session-store";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/useToast";

interface MessageBubbleProps {
  message: MessageData;
  isOwnMessage: boolean;
  onReply?: (message: MessageData) => void;
  onReact?: (messageId: string, emoji: string) => void;
  currentSessionId?: string | null;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({ message, isOwnMessage, onReply, onReact, currentSessionId }: MessageBubbleProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      toast(t.chat.messageCopied, "success");
    }
  };

  // Group reactions by emoji
  const groupedReactions = (message.reactions || []).reduce<
    Record<string, { emoji: string; count: number; names: string[]; isMine: boolean }>
  >((acc, r) => {
    if (!acc[r.emoji]) {
      acc[r.emoji] = { emoji: r.emoji, count: 0, names: [], isMine: false };
    }
    acc[r.emoji].count++;
    acc[r.emoji].names.push(r.reacterName);
    if (r.reacterId === currentSessionId) {
      acc[r.emoji].isMine = true;
    }
    return acc;
  }, {});

  const reactionGroups = Object.values(groupedReactions);

  // Read receipts (only show on own messages, exclude self)
  const readers = (message.readBy || []).filter((r) => r.readerId !== currentSessionId);

  // System messages
  if (message.type === "system") {
    return (
      <div className="flex justify-center py-1 animate-[fadeIn_0.3s_ease-out]">
        <span className="text-xs text-gray-500 bg-gray-900/50 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} px-4 group animate-[slideUp_0.15s_ease-out]`}>
      <div className="relative max-w-[75%]">
        {/* Action buttons (visible on hover) */}
        <div className={`absolute top-0 ${isOwnMessage ? "left-0 -translate-x-full" : "right-0 translate-x-full"} flex items-center gap-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity z-10`}>
          {message.type === "text" && (
            <button
              onClick={handleCopy}
              className="p-1 text-gray-500 hover:text-gray-300 rounded cursor-pointer"
              title={t.chat.copyMessage}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          )}
          {onReply && (
            <button
              onClick={() => onReply(message)}
              className="p-1 text-gray-500 hover:text-gray-300 rounded cursor-pointer"
              title={t.chat.replyTo}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
          )}
          {onReact && (
            <button
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="p-1 text-gray-500 hover:text-gray-300 rounded cursor-pointer"
              title={t.chat.react || "React"}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
        </div>

        {/* Quick emoji picker */}
        {showEmojiPicker && onReact && (
          <div
            className={`absolute ${isOwnMessage ? "right-0" : "left-0"} -top-10 z-20 flex items-center gap-0.5 bg-gray-800 border border-gray-700 rounded-full px-2 py-1 shadow-xl animate-[fadeIn_0.1s_ease-out]`}
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(message.id, emoji);
                  setShowEmojiPicker(false);
                }}
                className="w-7 h-7 flex items-center justify-center text-base hover:scale-125 transition-transform cursor-pointer rounded-full hover:bg-gray-700"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div
          className={`rounded-xl px-3 py-2 ${
            isOwnMessage
              ? "bg-red-900/40 border border-red-800/50"
              : "bg-gray-800 border border-gray-700/50"
          }`}
        >
          {/* Sender name */}
          {!isOwnMessage && message.senderName && (
            <p className="text-xs font-semibold text-red-400 mb-0.5">
              {message.senderName}
            </p>
          )}

          {/* Replied Message Quote */}
          {message.replyTo && (
            <div className="mb-2 p-2 rounded bg-gray-900/40 border-l-2 border-gray-600/50 text-xs text-left">
              <span className="font-semibold text-gray-400 block mb-0.5">
                {message.replyTo.sender?.displayName || message.replyTo.senderName || t.chat.unknownUser || "?"}
              </span>
              <span className="text-gray-500 line-clamp-1 break-all">
                {message.replyTo.content}
              </span>
            </div>
          )}

          {/* Message content */}
          {message.type === "attachment" ? (
            <FilePreview message={message} />
          ) : (
            <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}

          {/* Timestamp + Read receipts */}
          <div className={`flex items-center gap-1.5 mt-1 ${isOwnMessage ? "justify-end" : ""}`}>
            <span className={`text-[10px] ${isOwnMessage ? "text-red-400/60" : "text-gray-500"}`}>
              {formatTime(message.createdAt)}
            </span>
            {/* Read receipts on own messages */}
            {isOwnMessage && readers.length > 0 && (
              <div className="flex items-center gap-0.5" title={readers.map((r) => r.readerName).join(", ")}>
                <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[10px] text-blue-400/70">
                  {readers.length}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Reaction badges below the bubble */}
        {reactionGroups.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
            {reactionGroups.map((g) => (
              <button
                key={g.emoji}
                onClick={() => onReact?.(message.id, g.emoji)}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-colors cursor-pointer ${
                  g.isMine
                    ? "bg-blue-900/40 border border-blue-700/50 text-blue-300"
                    : "bg-gray-800 border border-gray-700/50 text-gray-400 hover:border-gray-600"
                }`}
                title={g.names.join(", ")}
              >
                <span>{g.emoji}</span>
                <span className="text-[10px]">{g.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Lightbox Modal ─────────────────────────────────── */
function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors cursor-pointer"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {/* Image */}
      <img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl animate-[scaleIn_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

/* ── Inline Image Preview ───────────────────────────── */
function InlineImagePreview({ message }: { message: MessageData }) {
  const att = message.attachment!;
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchUrl() {
      const session = getSession();
      if (!session) return;
      try {
        const result = await getFileDownloadUrl(att.id, session.sessionToken);
        if (!cancelled) setImgUrl(result.url);
      } catch {
        if (!cancelled) setError(true);
      }
    }
    fetchUrl();
    return () => { cancelled = true; };
  }, [att.id]);

  if (error) {
    return <GenericFilePreview message={message} />;
  }

  return (
    <>
      <div className="mt-1 rounded-lg overflow-hidden relative group/img cursor-pointer max-w-[280px]">
        {/* Skeleton while loading */}
        {loading && (
          <div className="w-full aspect-video bg-gray-700 animate-pulse rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {imgUrl && (
          <img
            src={imgUrl}
            alt={att.filename}
            className={`w-full rounded-lg transition-opacity duration-300 ${loading ? "opacity-0 absolute" : "opacity-100"}`}
            onLoad={() => setLoading(false)}
            onError={() => { setError(true); setLoading(false); }}
            onClick={() => setLightboxOpen(true)}
          />
        )}

        {/* Hover overlay */}
        {!loading && (
          <div
            className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors flex items-center justify-center"
            onClick={() => setLightboxOpen(true)}
          >
            <svg
              className="w-8 h-8 text-white opacity-0 group-hover/img:opacity-100 transition-opacity drop-shadow-lg"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        )}

        {/* Filename footer */}
        <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 px-0.5">
          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="truncate">{att.filename}</span>
          <span className="shrink-0">· {formatFileSize(att.size)}</span>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && imgUrl && (
        <ImageLightbox
          src={imgUrl}
          alt={att.filename}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

/* ── Generic File Download Button ───────────────────── */
function GenericFilePreview({ message }: { message: MessageData }) {
  const att = message.attachment;
  if (!att) return null;

  const handleDownload = async () => {
    const session = getSession();
    if (!session) return;
    try {
      const result = await getFileDownloadUrl(att.id, session.sessionToken);
      window.open(result.url, "_blank");
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  return (
    <button
      onClick={handleDownload}
      className="mt-1 flex items-center gap-2 p-2 rounded-md bg-gray-800/50 hover:bg-gray-800 transition-colors text-left w-full cursor-pointer group"
    >
      <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-xs shrink-0">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-blue-400 truncate group-hover:underline">{att.filename}</p>
        <p className="text-xs text-gray-500">{formatFileSize(att.size)}</p>
      </div>
      <svg className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </button>
  );
}

/* ── FilePreview dispatcher ─────────────────────────── */
function FilePreview({ message }: { message: MessageData }) {
  const att = message.attachment;
  if (!att) return null;

  const isImage = att.mimeType.startsWith("image/");

  if (isImage) {
    return <InlineImagePreview message={message} />;
  }

  return <GenericFilePreview message={message} />;
}

