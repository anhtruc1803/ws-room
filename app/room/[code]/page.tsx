"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { RoomHeader } from "@/components/room/RoomHeader";
import { ChatArea } from "@/components/room/ChatArea";
import { MessageInput } from "@/components/room/MessageInput";
import { ParticipantList } from "@/components/room/ParticipantList";
import { WatermarkOverlay } from "@/components/room/WatermarkOverlay";
import { RoomInfoModal } from "@/components/room/RoomInfoModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useSocket } from "@/hooks/useSocket";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/useToast";
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
  const { t } = useTranslation();
  const { toast } = useToast();

  // State
  const [room, setRoom] = useState<RoomData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replyTo, setReplyTo] = useState<MessageData | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("war-room-sound") !== "false";
    }
    return true;
  });

  // Session
  const session = typeof window !== "undefined" ? getSession() : null;
  const sessionToken = session?.sessionToken || "";
  const participantId = session?.participantId || "";
  const displayName = session?.displayName || "";
  const isOwner = session?.role === "owner";

  // Sound notification
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.1;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio not supported
    }
  }, [soundEnabled]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("war-room-sound", String(next));
  };

  // Socket callbacks
  const onMessage = useCallback((msg: MessageData) => {
    setMessages((prev) => {
      // Prevent duplicates
      if (prev.find((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
    // Play sound for messages from others
    if (msg.senderSessionId !== participantId && msg.type !== "system") {
      playNotificationSound();
    }
  }, [participantId, playNotificationSound]);

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
  const { connected, sendMessage, emitTyping, markRead, reactMessage } = useSocket({
    token: sessionToken,
    roomCode: code,
    onMessage,
    onUserJoined,
    onUserLeft,
    onRoomEnded,
    onTyping: useCallback((name: string) => {
      setTypingUsers((prev) => {
        if (prev.includes(name)) return prev;
        return [...prev, name];
      });
      // Remove after 3s
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((n) => n !== name));
      }, 3000);
    }, []),
    onMessagesRead: useCallback((data: { messageIds: string[]; readerId: string; readerName: string }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (!data.messageIds.includes(msg.id)) return msg;
          const existing = msg.readBy || [];
          if (existing.find((r) => r.readerId === data.readerId)) return msg;
          return {
            ...msg,
            readBy: [...existing, { readerId: data.readerId, readerName: data.readerName }],
          };
        })
      );
    }, []),
    onMessageReacted: useCallback((data: { messageId: string; reactions: { emoji: string; reacterId: string; reacterName: string }[] }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== data.messageId) return msg;
          return { ...msg, reactions: data.reactions };
        })
      );
    }, []),
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
        setError(err instanceof Error ? err.message : t.room.roomNotFound);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [code, sessionToken, router, t.room.roomNotFound]);

  // End room handler
  const handleEndRoom = async () => {
    setShowEndConfirm(false);
    try {
      const result = await endRoomApi(code, sessionToken);
      setRoom((prev) => (prev ? { ...prev, ...result.room } : prev));
      toast(t.roomHeader.ended, "info");
    } catch (err) {
      toast(err instanceof Error ? err.message : t.room.errorEndRoom, "error");
    }
  };

  // Expiry check
  const [isExpiredLocally, setIsExpiredLocally] = useState(false);

  useEffect(() => {
    if (!room?.expiresAt) return;
    function checkExpiry() {
      const expired = new Date(room!.expiresAt).getTime() <= Date.now();
      setIsExpiredLocally(expired);
    }
    checkExpiry();
    const timer = setInterval(checkExpiry, 1000);
    return () => clearInterval(timer);
  }, [room?.expiresAt]);

  // Loading — skeleton
  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-gray-950">
        {/* Skeleton header */}
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
            <div>
              <div className="h-3.5 w-32 bg-gray-700 rounded" />
              <div className="h-2.5 w-20 bg-gray-800 rounded mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-gray-800 rounded" />
            <div className="h-8 w-8 bg-gray-800 rounded" />
          </div>
        </div>
        {/* Skeleton messages */}
        <div className="flex-1 p-4 space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
              <div className={`rounded-xl p-3 ${i % 2 === 0 ? "bg-red-900/20" : "bg-gray-800"}`} style={{ width: `${30 + i * 15}%` }}>
                <div className="h-2.5 bg-gray-700 rounded w-16 mb-2" />
                <div className="h-3 bg-gray-700 rounded" />
                <div className="h-3 bg-gray-700 rounded mt-1 w-3/4" />
              </div>
            </div>
          ))}
        </div>
        {/* Skeleton input */}
        <div className="border-t border-gray-800 bg-gray-900 px-4 py-3 animate-pulse">
          <div className="flex gap-2">
            <div className="w-9 h-9 bg-gray-800 rounded-lg" />
            <div className="flex-1 h-10 bg-gray-800 rounded-lg" />
            <div className="w-9 h-9 bg-gray-800 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !room) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center max-w-md animate-[fadeIn_0.3s_ease-out]">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-100 mb-2">
            {t.room.cannotAccess}
          </h2>
          <p className="text-gray-400 mb-6">{error || t.room.roomNotFound}</p>
          <button
            onClick={() => router.push("/")}
            className="text-red-400 hover:text-red-300 underline cursor-pointer"
          >
            {t.room.returnHome}
          </button>
        </div>
      </div>
    );
  }

  const isEnded = room.status !== "active" || isExpiredLocally;

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
        onEndRoom={() => setShowEndConfirm(true)}
        onToggleParticipants={() => setShowParticipants(!showParticipants)}
        onShowRoomInfo={() => setShowRoomInfo(true)}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
      />

      {/* Connection status bar */}
      {!connected && !isEnded && (
        <div className="bg-yellow-900/30 border-b border-yellow-800 px-4 py-1.5 text-center">
          <span className="text-xs text-yellow-400">{t.room.connecting}</span>
        </div>
      )}

      {/* Ended banner */}
      {isEnded && (
        <div className="bg-red-900/30 border-b border-red-800 px-4 py-2 text-center">
          <span className="text-sm text-red-300">
            {t.room.roomEnded}
          </span>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <ChatArea
            messages={messages}
            currentSessionId={participantId}
            onReply={(msg) => setReplyTo(msg)}
            typingUsers={typingUsers}
            onMarkRead={markRead}
            onReact={reactMessage}
          />
          <MessageInput
            onSendMessage={sendMessage}
            onTyping={emitTyping}
            roomCode={code}
            sessionToken={sessionToken}
            disabled={isEnded}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
          />
        </div>

        <ParticipantList
          participants={participants}
          currentSessionId={participantId}
          visible={showParticipants}
          onClose={() => setShowParticipants(false)}
        />
      </div>

      {/* End room confirm dialog */}
      <ConfirmDialog
        open={showEndConfirm}
        title={t.confirmDialog.endRoomTitle}
        message={t.confirmDialog.endRoomMessage}
        confirmLabel={t.confirmDialog.endRoomConfirm}
        cancelLabel={t.confirmDialog.cancel}
        variant="danger"
        onConfirm={handleEndRoom}
        onCancel={() => setShowEndConfirm(false)}
      />

      {/* Room info modal */}
      <RoomInfoModal
        open={showRoomInfo}
        onClose={() => setShowRoomInfo(false)}
        room={{
          title: room.title,
          description: room.description,
          roomCode: room.roomCode,
          status: room.status,
          createdAt: room.createdAt || "",
          expiresAt: room.expiresAt,
        }}
      />
    </div>
  );
}
