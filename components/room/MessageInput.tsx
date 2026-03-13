"use client";

import { useState, useRef, useCallback } from "react";
import { uploadFile } from "@/lib/api-client";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/useToast";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/upload-validation";
import type { MessageData } from "@/lib/api-client";

interface MessageInputProps {
  onSendMessage: (content: string, replyToId?: string) => void;
  onTyping?: () => void;
  roomCode: string;
  sessionToken: string;
  disabled?: boolean;
  replyTo?: MessageData | null;
  onCancelReply?: () => void;
}

export function MessageInput({
  onSendMessage,
  onTyping,
  roomCode,
  sessionToken,
  disabled,
  replyTo,
  onCancelReply,
}: MessageInputProps) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0 || disabled) return;
    onSendMessage(trimmed, replyTo?.id);
    setText("");
    onCancelReply?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Emit typing indicator (throttled)
    if (onTyping && !typingTimerRef.current) {
      onTyping();
      typingTimerRef.current = setTimeout(() => {
        typingTimerRef.current = null;
      }, 2000);
    }
  };

  const processFile = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast(t.chat.fileTooLarge.replace("{size}", String(MAX_FILE_SIZE / 1024 / 1024)), "error");
      return;
    }

    setUploading(true);
    try {
      await uploadFile(roomCode, sessionToken, file);
      toast(t.chat.uploadSuccess, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : t.chat.uploadFailed, "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [roomCode, sessionToken, t, toast]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // ── Drag & drop handlers ──
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const acceptTypes = Object.keys(ALLOWED_MIME_TYPES).join(",");

  return (
    <div
      className="border-t border-gray-800 bg-gray-900 shrink-0 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-red-900/20 border-2 border-dashed border-red-500 rounded-lg flex items-center justify-center z-10 drag-overlay">
          <div className="text-center">
            <svg className="w-8 h-8 mx-auto text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm text-red-300 font-medium">{t.chat.dragDropHint}</span>
          </div>
        </div>
      )}

      {/* Reply preview bar */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 border-b border-gray-700/50 animate-[slideUp_0.15s_ease-out]">
          <div className="w-0.5 h-6 bg-red-500 rounded-full shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-red-400">{t.chat.replying} {replyTo.senderName}</p>
            <p className="text-xs text-gray-400 truncate">{replyTo.content}</p>
          </div>
          <button onClick={onCancelReply} className="text-gray-500 hover:text-gray-300 cursor-pointer shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="px-4 py-3">
        <div className="flex items-end gap-2">
          {/* File upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shrink-0"
            title={t.chat.uploadFile}
          >
            {uploading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept={acceptTypes}
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Text input */}
          <textarea
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? t.chat.roomEndedPlaceholder : t.chat.typePlaceholder}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 disabled:opacity-50 max-h-32"
            style={{ minHeight: "40px" }}
          />

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || text.trim().length === 0}
            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
