"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { createRoom } from "@/lib/api-client";
import { saveSession } from "@/lib/session-store";
import { useTranslation } from "@/hooks/useTranslation";

export default function CreateRoomPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [duration, setDuration] = useState(60);
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);

  const DURATION_OPTIONS = [
    { label: t.createRoom.duration15m, value: 15 },
    { label: t.createRoom.duration30m, value: 30 },
    { label: t.createRoom.duration1h, value: 60 },
    { label: t.createRoom.duration2h, value: 120 },
    { label: t.createRoom.duration4h, value: 240 },
    { label: t.createRoom.duration8h, value: 480 },
    { label: t.createRoom.duration24h, value: 1440 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError(t.createRoom.errorTitleRequired);
      return;
    }
    if (!displayName.trim()) {
      setError(t.createRoom.errorNameRequired);
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

      router.push(`/room-created?code=${result.room.roomCode}&title=${encodeURIComponent(title.trim())}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.createRoom.errorCreateFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative">
      {/* Language switcher */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <button onClick={() => router.push("/")} className="inline-block cursor-pointer">
            <Logo size="sm" />
          </button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.createRoom.title}</CardTitle>
            <CardDescription>
              {t.createRoom.description}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t.createRoom.incidentTitle}
              placeholder={t.createRoom.incidentTitlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
            />

            <Textarea
              label={t.createRoom.descriptionLabel}
              placeholder={t.createRoom.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
            />

            <Input
              label={t.createRoom.displayName}
              placeholder={t.createRoom.displayNamePlaceholder}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={50}
            />

            {/* Duration selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {t.createRoom.roomDuration}
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
                <span className="text-sm text-gray-300">{t.createRoom.requirePassword}</span>
              </label>
              {usePassword && (
                <div className="mt-2">
                  <Input
                    type="password"
                    placeholder={t.createRoom.roomPassword}
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
              {t.createRoom.createButton}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
