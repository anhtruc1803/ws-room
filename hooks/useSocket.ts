"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { MessageData, ParticipantData } from "@/lib/api-client";

interface UseSocketOptions {
  token: string;
  roomCode: string;
  onMessage: (message: MessageData) => void;
  onUserJoined: (participant: ParticipantData) => void;
  onUserLeft: (participant: ParticipantData) => void;
  onRoomEnded: () => void;
  onTyping?: (displayName: string) => void;
}

export function useSocket({
  token,
  roomCode,
  onMessage,
  onUserJoined,
  onUserLeft,
  onRoomEnded,
  onTyping,
}: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Socket.IO server runs on a separate port from Next.js
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || (() => {
      const origin = window.location.origin;
      try {
        const url = new URL(origin);
        url.port = "3001";
        return url.toString();
      } catch {
        return "http://localhost:3001";
      }
    })();

    console.log("[Socket] Connecting to:", socketUrl);
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      autoConnect: false,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Connected");
      socket.emit("authenticate", { token });
    });

    socket.on("authenticated", () => {
      console.log("[Socket] Authenticated, joining room...");
      socket.emit("join-room", { roomCode });
      setConnected(true);
    });

    socket.on("new-message", (message: MessageData) => {
      onMessage(message);
    });

    // Server sends { participant, message } for user-joined
    socket.on("user-joined", (data: { participant: ParticipantData; message?: MessageData }) => {
      onUserJoined(data.participant);
      if (data.message) {
        onMessage(data.message as MessageData);
      }
    });

    // Server sends { participant, message } for user-left
    socket.on("user-left", (data: { participant: ParticipantData; message?: MessageData }) => {
      onUserLeft(data.participant);
      if (data.message) {
        onMessage(data.message as MessageData);
      }
    });

    socket.on("room-ended", () => {
      onRoomEnded();
    });

    // Typing indicator from other users
    socket.on("user-typing", (data: { displayName: string }) => {
      onTyping?.(data.displayName);
    });

    socket.on("error", (err: { message: string }) => {
      console.error("[Socket] Error:", err.message);
    });

    socket.on("connect_error", (err: Error) => {
      console.error("[Socket] Connection error:", err.message);
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
      setConnected(false);
    });

    socket.connect();

    return () => {
      socket.emit("leave-room");

      socket.off("connect");
      socket.off("authenticated");
      socket.off("new-message");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("room-ended");
      socket.off("user-typing");
      socket.off("error");
      socket.off("connect_error");
      socket.off("disconnect");

      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, roomCode]);

  const sendMessage = useCallback((content: string) => {
    socketRef.current?.emit("send-message", {
      content,
      type: "text",
    });
  }, []);

  const emitTyping = useCallback(() => {
    socketRef.current?.emit("typing");
  }, []);

  return { connected, sendMessage, emitTyping };
}
