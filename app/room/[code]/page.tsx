"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { RoomHeader } from "@/components/room/RoomHeader";
import { ChatArea } from "@/components/room/ChatArea";
import { MessageInput } from "@/components/room/MessageInput";
import { ParticipantList } from "@/components/room/ParticipantList";
import { WatermarkOverlay } from "@/components/room/WatermarkOverlay";
import { useSocket } from "@/hooks/useSocket";
import { getSession } from "@/lib/session-store";
import {
  getRoomInfo,
  endRoom as endRoomApi,
  type RoomData,
  type MessageData,
  type ParticipantData,
} from "@/lib/api-client";

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();

  // State
  const [room, setRoom] = useState<RoomData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Session
  const session = typeof window !== "undefined" ? getSession() : null;
  const sessionToken = session?.sessionToken || "";
  const participantId = session?.participantId || "";
  const displayName = session?.displayName || "";
  const isOwner = session?.role === "owner";

  // Socket callbacks
  const onMessage = useCallback((msg: MessageData) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const onUserJoined = useCallback((p: ParticipantData) => {
    setParticipants((prev) => {
      if (prev.find((x) => x.id === p.id)) return prev;
      return [...prev, p];
    });
  }, []);

  const onUserLeft = useCallback((p: ParticipantData) => {
    setParticipants((prev) => prev.filter((x) => x.id !== p.id));
  }, []);

  const onRoomEnded = useCallback(() => {
    setRoom((prev) => (prev ? { ...prev, status: "locked" } : prev));
  }, []);

  // Socket connection
  const { connected, sendMessage } = useSocket({
    token: sessionToken,
    roomCode: code,
    onMessage,
    onUserJoined,
    onUserLeft,
    onRoomEnded,
  });

  // Load initial room data
  useEffect(() => {
    if (!sessionToken) {
      router.replace(`/join/${code}`);
      return;
    }

    async function load() {
      try {
        const data = await getRoomInfo(code, sessionToken);
        setRoom(data.room);
        setMessages(data.messages);
        setParticipants(data.participants);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load room");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [code, sessionToken, router]);

  // End room handler
  const handleEndRoom = async () => {
    if (!confirm("Are you sure you want to end this room? This cannot be undone.")) return;
    try {
      const result = await endRoomApi(code, sessionToken);
      setRoom((prev) => (prev ? { ...prev, ...result.room } : prev));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to end room");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="w-8 h-8 animate-spin mx-auto text-red-500 mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400 text-sm">Loading room...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !room) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-100 mb-2">
            Cannot Access Room
          </h2>
          <p className="text-gray-400 mb-6">{error || "Room not found"}</p>
          <button
            onClick={() => router.push("/")}
            className="text-red-400 hover:text-red-300 underline cursor-pointer"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const isEnded = room.status !== "active";

  return (
    <div className="h-screen flex flex-col bg-gray-950 relative">
      {/* Watermark */}
      <WatermarkOverlay displayName={displayName} />

      {/* Header */}
      <RoomHeader
        title={room.title}
        roomCode={room.roomCode}
        expiresAt={room.expiresAt}
        status={room.status}
        isOwner={isOwner}
        participantCount={participants.length}
        onEndRoom={handleEndRoom}
        onToggleParticipants={() => setShowParticipants(!showParticipants)}
      />

      {/* Connection status bar */}
      {!connected && !isEnded && (
        <div className="bg-yellow-900/30 border-b border-yellow-800 px-4 py-1.5 text-center">
          <span className="text-xs text-yellow-400">Connecting...</span>
        </div>
      )}

      {/* Ended banner */}
      {isEnded && (
        <div className="bg-red-900/30 border-b border-red-800 px-4 py-2 text-center">
          <span className="text-sm text-red-300">
            This room has been ended. Messages are read-only.
          </span>
        </div>
      )}

      {/* Main content: chat + participants */}
      <div className="flex flex-1 min-h-0">
        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatArea
            messages={messages}
            currentSessionId={participantId}
          />

          {/* Message input */}
          <MessageInput
            onSendMessage={sendMessage}
            roomCode={code}
            sessionToken={sessionToken}
            disabled={isEnded}
          />
        </div>

        {/* Participants sidebar */}
        <ParticipantList
          participants={participants}
          currentSessionId={participantId}
          visible={showParticipants}
          onClose={() => setShowParticipants(false)}
        />
      </div>
    </div>
  );
}
