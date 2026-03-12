"use client";

interface WatermarkOverlayProps {
  displayName: string;
}

/**
 * Semi-transparent watermark overlay showing the viewer's name.
 * Makes screenshots traceable to the person who took them.
 */
export function WatermarkOverlay({ displayName }: WatermarkOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-10">
      <div className="w-full h-full flex flex-wrap items-center justify-center gap-32 -rotate-12 opacity-[0.04]">
        {Array.from({ length: 20 }).map((_, i) => (
          <span
            key={i}
            className="text-white text-xl font-bold whitespace-nowrap"
          >
            {displayName}
          </span>
        ))}
      </div>
    </div>
  );
}
