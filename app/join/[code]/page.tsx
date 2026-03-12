"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { joinRoom } from "@/lib/api-client";
import { saveSession } from "@/lib/session-store";

export default function JoinRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!displayName.trim()) {
      setError("Display name is required");
      return;
    }

    setLoading(true);
    try {
      const result = await joinRoom(code, {
        displayName: displayName.trim(),
        password: password || undefined,
      });

      saveSession({
        roomCode: result.room.roomCode,
        sessionToken: result.sessionToken,
        displayName: result.participant.displayName,
        role: result.participant.role,
        participantId: result.participant.id,
      });

      router.push(`/room/${result.room.roomCode}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to join room";
      if (message.toLowerCase().includes("password")) {
        setNeedsPassword(true);
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <button onClick={() => router.push("/")} className="inline-block cursor-pointer">
            <Logo size="sm" />
          </button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Join Incident Room</CardTitle>
            <CardDescription>
              Room Code:{" "}
              <span className="font-mono text-gray-200 tracking-wider">{code}</span>
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleJoin} className="space-y-4">
            <Input
              label="Your Display Name"
              placeholder="e.g. Bob (Backend)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={50}
              autoFocus
            />

            {needsPassword && (
              <Input
                label="Room Password"
                type="password"
                placeholder="Enter room password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Join Room
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
