"use client";

import type { MessageData } from "@/lib/api-client";
import { getFileDownloadUrl } from "@/lib/api-client";
import { getSession } from "@/lib/session-store";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/useToast";

interface MessageBubbleProps {
  message: MessageData;
  isOwnMessage: boolean;
  onReply?: (message: MessageData) => void;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FilePreview({ message }: { message: MessageData }) {
  const att = message.attachment;
  if (!att) return null;

  const isImage = att.mimeType.startsWith("image/");

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
        {isImage ? (
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )}
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

export function MessageBubble({ message, isOwnMessage, onReply }: MessageBubbleProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      toast(t.chat.messageCopied, "success");
    }
  };

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
        <div className={`absolute top-0 ${isOwnMessage ? "left-0 -translate-x-full" : "right-0 translate-x-full"} flex items-center gap-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
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
        </div>

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
            <div className="mb-2 p-2 rounded bg-gray-900/40 border-l-2 border-gray-600/50 text-xs">
              <span className="font-semibold text-gray-400 block mb-0.5">
                {message.replyTo.senderName || "?"}
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

          {/* Timestamp */}
          <p className={`text-[10px] mt-1 ${isOwnMessage ? "text-red-400/60" : "text-gray-500"}`}>
            {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
