"use client";

import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";

interface RoomInfoModalProps {
  open: boolean;
  onClose: () => void;
  room: {
    title: string;
    description?: string | null;
    roomCode: string;
    status: string;
    createdAt: string;
    expiresAt: string;
    ownerName?: string;
  };
}

export function RoomInfoModal({ open, onClose, room }: RoomInfoModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [linkCopied, setLinkCopied] = useState(false);

  if (!open) return null;

  const inviteUrl = `${window.location.origin}/join/${room.roomCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setLinkCopied(true);
    toast(t.roomInfo.copied, "success");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-md w-full p-6 animate-[scaleIn_0.2s_ease-out]">
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <h2 className="text-lg font-bold text-gray-100 mb-4">{t.roomInfo.title}</h2>

        {/* Info grid */}
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-gray-500 text-xs">{t.roomInfo.status}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${room.status === "active" ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-gray-200">
                {room.status === "active" ? t.roomInfo.active : t.roomInfo.locked}
              </span>
            </div>
          </div>

          {room.description && (
            <div>
              <span className="text-gray-500 text-xs">{t.roomInfo.description}</span>
              <p className="text-gray-200 mt-0.5">{room.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-gray-500 text-xs">{t.roomInfo.createdAt}</span>
              <p className="text-gray-200 mt-0.5 text-xs">{formatDate(room.createdAt)}</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">{t.roomInfo.expiresAt}</span>
              <p className="text-gray-200 mt-0.5 text-xs">{formatDate(room.expiresAt)}</p>
            </div>
          </div>
        </div>

        {/* Invite link */}
        <div className="mt-4 pt-4 border-t border-gray-800">
          <span className="text-gray-500 text-xs">{t.roomInfo.inviteLink}</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono truncate"
            />
            <Button
              variant={linkCopied ? "primary" : "secondary"}
              size="sm"
              onClick={copyLink}
            >
              {linkCopied ? t.roomInfo.copied : t.roomInfo.copyLink}
            </Button>
          </div>
        </div>

        {/* Room code */}
        <div className="mt-3 text-center">
          <p className="text-gray-500 text-xs mb-1">Room Code</p>
          <p className="text-2xl font-mono font-bold text-gray-100 tracking-widest">{room.roomCode}</p>
        </div>
      </div>
    </div>
  );
}
