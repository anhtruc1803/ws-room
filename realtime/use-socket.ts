"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

// ============================================================
// Types
// ============================================================

export interface ChatMessage {
  id: string;
  senderSessionId: string | null;
  senderName: string | null;
  type: "text" | "system" | "attachment";
  content: string;
  createdAt: string;
  attachment?: {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
  } | null;
}

export interface Participant {
  id: string;
  displayName: string;
  role: string;
  joinedAt?: string;
}

interface UseSocketOptions {
  token: string;
  roomCode: string;
  onMessage?: (message: ChatMessage) => void;
  onUserJoined?: (participant: Participant, sysMessage: ChatMessage) => void;
  onUserLeft?: (participant: Participant, sysMessage: ChatMessage) => void;
  onParticipantsList?: (participants: Participant[]) => void;
  onRoomEnded?: () => void;
  onError?: (error: { message: string }) => void;
}

// ============================================================
// Hook
// ============================================================

export function useSocket(options: UseSocketOptions) {
  const {
    token,
    roomCode,
    onMessage,
    onUserJoined,
    onUserLeft,
    onParticipantsList,
    onRoomEnded,
    onError,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Stable refs for callbacks to avoid re-connecting on callback changes
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  useEffect(() => {
    const socket = io({
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // ── Connection ──────────────────────────────────────
    socket.on("connect", () => {
      console.log("[Socket] Connected");
      setIsConnected(true);
      // Authenticate immediately on connect
      socket.emit("authenticate", { token });
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
      setIsConnected(false);
      setIsAuthenticated(false);
    });

    // ── Auth ────────────────────────────────────────────
    socket.on("authenticated", () => {
      console.log("[Socket] Authenticated, joining room...");
      setIsAuthenticated(true);
      socket.emit("join-room");
    });

    // ── Room Events ─────────────────────────────────────
    socket.on("new-message", (message: ChatMessage) => {
      callbacksRef.current.onMessage?.(message);
    });

    socket.on(
      "user-joined",
      (data: { participant: Participant; message: ChatMessage }) => {
        callbacksRef.current.onUserJoined?.(data.participant, data.message);
      }
    );

    socket.on(
      "user-left",
      (data: { participant: Participant; message: ChatMessage }) => {
        callbacksRef.current.onUserLeft?.(data.participant, data.message);
      }
    );

    socket.on(
      "participants-list",
      (data: { participants: Participant[] }) => {
        callbacksRef.current.onParticipantsList?.(data.participants);
      }
    );

    socket.on("room-ended", () => {
      callbacksRef.current.onRoomEnded?.();
    });

    socket.on("error", (data: { message: string }) => {
      console.error("[Socket] Error:", data.message);
      callbacksRef.current.onError?.(data);
    });

    // ── Cleanup ─────────────────────────────────────────
    return () => {
      socket.emit("leave-room");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, roomCode]);

  // ── Send Message ──────────────────────────────────────
  const sendMessage = useCallback((content: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      console.warn("[Socket] Not connected");
      return;
    }
    socket.emit("send-message", { content, type: "text" });
  }, []);

  return {
    isConnected,
    isAuthenticated,
    sendMessage,
    socket: socketRef,
  };
}
