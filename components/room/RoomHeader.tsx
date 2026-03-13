"use client";

import { useCountdown } from "@/hooks/useCountdown";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/useToast";
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
  onShowRoomInfo?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
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
  onShowRoomInfo,
  soundEnabled,
  onToggleSound,
}: RoomHeaderProps) {
  const remaining = useCountdown(expiresAt);
  const isExpired = remaining === "Expired";
  const { t } = useTranslation();
  const { toast } = useToast();

  // Calculate progress percentage for countdown bar
  const getProgress = () => {
    if (status === "locked" || isExpired) return 0;
    const total = new Date(expiresAt).getTime() - Date.now();
    if (total <= 0) return 0;
    // Rough estimate: assume max 24h = 86400000ms
    const maxDuration = 24 * 60 * 60 * 1000;
    return Math.min(100, (total / maxDuration) * 100);
  };

  return (
    <header className="bg-gray-900 border-b border-gray-800 shrink-0">
      <div className="px-4 py-3 flex items-center justify-between gap-4">
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
            <button
              onClick={onShowRoomInfo}
              className="text-sm font-semibold text-gray-100 truncate hover:text-white cursor-pointer block"
              title={t.roomHeader.roomInfo}
            >
              {title}
            </button>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-mono">{roomCode}</span>
              <span>·</span>
              <span className={isExpired ? "text-red-400" : "text-yellow-400"}>
                {status === "locked"
                  ? t.roomHeader.ended
                  : isExpired
                    ? t.roomHeader.expired
                    : remaining}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Sound toggle */}
          {onToggleSound && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSound}
              title={soundEnabled ? t.sound.disable : t.sound.enable}
            >
              {soundEnabled ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              )}
            </Button>
          )}

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
              toast(t.roomHeader.linkCopied, "success");
            }}
            title={t.roomHeader.copyInviteLink}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </Button>

          {/* End room button (owner only) */}
          {isOwner && status === "active" && !isExpired && (
            <Button variant="danger" size="sm" onClick={onEndRoom}>
              {t.roomHeader.endRoom}
            </Button>
          )}
        </div>
      </div>

      {/* Countdown progress bar */}
      {status === "active" && !isExpired && (
        <div className="h-0.5 bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-red-600 to-yellow-500 transition-all duration-1000"
            style={{ width: `${getProgress()}%` }}
          />
        </div>
      )}
    </header>
  );
}
