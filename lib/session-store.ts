"use client";

/**
 * Client-side session storage for room tokens.
 * Uses sessionStorage — data clears when tab closes.
 */

interface RoomSession {
  roomCode: string;
  sessionToken: string;
  displayName: string;
  role: string;
  participantId: string;
}

const STORAGE_KEY = "warroom_session";

export function saveSession(session: RoomSession): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getSession(): RoomSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RoomSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
