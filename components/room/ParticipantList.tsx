"use client";

import type { ParticipantData } from "@/lib/api-client";

interface ParticipantListProps {
  participants: ParticipantData[];
  currentSessionId: string | null;
  visible: boolean;
  onClose: () => void;
}

export function ParticipantList({
  participants,
  currentSessionId,
  visible,
  onClose,
}: ParticipantListProps) {
  if (!visible) return null;

  return (
    <div className="w-64 border-l border-gray-800 bg-gray-900 flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300">
          Participants ({participants.length})
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {participants.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800/50"
          >
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-300 shrink-0">
              {p.displayName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="text-sm text-gray-200 truncate">
                {p.displayName}
                {p.id === currentSessionId && (
                  <span className="text-xs text-gray-500 ml-1">(you)</span>
                )}
              </p>
              {p.role === "owner" && (
                <span className="text-[10px] text-yellow-500 font-medium">
                  OWNER
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
