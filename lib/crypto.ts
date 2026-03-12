import { randomBytes, createHash } from "crypto";

/** Generate 8-char uppercase hex room code */
export function generateRoomCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

/** Generate secure session token */
export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

/** Hash password with SHA-256 + salt (simple, no bcrypt dep needed for MVP) */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256")
    .update(salt + password)
    .digest("hex");
  return `${salt}:${hash}`;
}

/** Verify password against stored hash */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const check = createHash("sha256")
    .update(salt + password)
    .digest("hex");
  return check === hash;
}
