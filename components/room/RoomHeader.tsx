"use client";

import { useCountdown } from "@/hooks/useCountdown";
import { Button } from "@/components/ui/Button";

interface RoomHeaderProps {
  title: string;
  roomCode: string;
  expiresAt: string;
  status: string;
  isOwner: boolean;
  participantCount: number;
  onEndRoom: () => void;
  onToggleParticipants: () => void;
}

export function RoomHeader({
  title,
  roomCode,
  expiresAt,
  status,
  isOwner,
  participantCount,
  onEndRoom,
  onToggleParticipants,
}: RoomHeaderProps) {
  const remaining = useCountdown(expiresAt);
  const isExpired = remaining === "Expired";

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Status indicator */}
        <div
          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            status === "active" && !isExpired
              ? "bg-green-500 animate-pulse"
              : "bg-red-500"
          }`}
        />
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-gray-100 truncate">{title}</h1>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-mono">{roomCode}</span>
            <span>·</span>
            <span className={isExpired ? "text-red-400" : "text-yellow-400"}>
              {status === "locked" ? "Ended" : remaining}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Participants toggle */}
        <Button variant="ghost" size="sm" onClick={onToggleParticipants}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {participantCount}
        </Button>

        {/* Copy invite link */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const url = `${window.location.origin}/join/${roomCode}`;
            navigator.clipboard.writeText(url);
          }}
          title="Copy invite link"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </Button>

        {/* End room button (owner only) */}
        {isOwner && status === "active" && (
          <Button variant="danger" size="sm" onClick={onEndRoom}>
            End Room
          </Button>
        )}
      </div>
    </header>
  );
}
