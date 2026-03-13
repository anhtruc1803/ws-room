"use client";

import type { ParticipantData } from "@/lib/api-client";
import { useTranslation } from "@/hooks/useTranslation";

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
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <>
      {/* Mobile backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-20 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-72 md:w-64 md:relative md:top-auto md:right-auto md:h-auto z-30 md:z-auto border-l border-gray-800 bg-gray-900 flex flex-col shrink-0 animate-[slideIn_0.2s_ease-out] md:animate-none">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300">
            {t.participants.title} ({participants.length})
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

        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          {participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800/50 transition-colors"
            >
              {/* Avatar */}
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                {p.displayName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="text-sm text-gray-200 truncate">
                  {p.displayName}
                  {p.id === currentSessionId && (
                    <span className="text-xs text-gray-500 ml-1">{t.participants.you}</span>
                  )}
                </p>
                {p.role === "owner" && (
                  <span className="text-[10px] text-yellow-500 font-medium">
                    {t.participants.owner}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
