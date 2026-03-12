"use client";

import type { MessageData } from "@/lib/api-client";
import { getFileDownloadUrl } from "@/lib/api-client";
import { getSession } from "@/lib/session-store";

interface MessageBubbleProps {
  message: MessageData;
  isOwnMessage: boolean;
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
      className="mt-1 flex items-center gap-2 p-2 rounded-md bg-gray-800/50 hover:bg-gray-800 transition-colors text-left w-full cursor-pointer"
    >
      <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-xs shrink-0">
        {isImage ? (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-blue-400 truncate">{att.filename}</p>
        <p className="text-xs text-gray-500">{formatFileSize(att.size)}</p>
      </div>
    </button>
  );
}

export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  // System messages
  if (message.type === "system") {
    return (
      <div className="flex justify-center py-1">
        <span className="text-xs text-gray-500 bg-gray-900/50 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} px-4`}>
      <div
        className={`max-w-[75%] rounded-xl px-3 py-2 ${
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
  );
}
