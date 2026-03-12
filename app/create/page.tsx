"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { createRoom } from "@/lib/api-client";
import { saveSession } from "@/lib/session-store";

const DURATION_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
  { label: "4 hours", value: 240 },
  { label: "8 hours", value: 480 },
  { label: "24 hours", value: 1440 },
];

export default function CreateRoomPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [duration, setDuration] = useState(60);
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Incident title is required");
      return;
    }
    if (!displayName.trim()) {
      setError("Your display name is required");
      return;
    }

    setLoading(true);
    try {
      const result = await createRoom({
        title: title.trim(),
        description: description.trim() || undefined,
        durationMinutes: duration,
        password: usePassword ? password : undefined,
        createdByName: displayName.trim(),
      });

      saveSession({
        roomCode: result.room.roomCode,
        sessionToken: result.sessionToken,
        displayName: displayName.trim(),
        role: "owner",
        participantId: result.room.id,
      });

      router.push(`/room/${result.room.roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
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
            <CardTitle>Create Incident Room</CardTitle>
            <CardDescription>
              Set up a temporary collaboration space for your team.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Incident Title"
              placeholder="e.g. Database outage - Production"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
            />

            <Textarea
              label="Description (optional)"
              placeholder="Brief description of the incident..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
            />

            <Input
              label="Your Display Name"
              placeholder="e.g. Alice (SRE)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={50}
            />

            {/* Duration selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Room Duration
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDuration(opt.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                      duration === opt.value
                        ? "bg-red-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Password toggle */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={usePassword}
                  onChange={(e) => setUsePassword(e.target.checked)}
                  className="rounded border-gray-700 bg-gray-900 text-red-500 focus:ring-red-500"
                />
                <span className="text-sm text-gray-300">Require password to join</span>
              </label>
              {usePassword && (
                <div className="mt-2">
                  <Input
                    type="password"
                    placeholder="Room password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Create Room
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
