"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/hooks/useTranslation";

export default function HomePage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const { t } = useTranslation();

  const handleJoinByCode = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length > 0) {
      router.push(`/join/${code}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 relative">
      {/* Language switcher */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="text-center max-w-lg w-full">
        <Logo size="lg" />
        <p className="text-lg text-gray-400 mt-3 mb-10">
          {t.landing.subtitle}
        </p>

        <div className="space-y-4">
          {/* Create Room */}
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => router.push("/create")}
          >
            {t.landing.createRoom}
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 text-gray-600">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-sm">{t.landing.orJoinExisting}</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* Join Room */}
          <Card className="!p-4">
            <div className="flex gap-2">
              <Input
                placeholder={t.landing.enterRoomCode}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
                maxLength={8}
                className="font-mono text-center tracking-widest"
              />
              <Button
                variant="secondary"
                onClick={handleJoinByCode}
                disabled={joinCode.trim().length === 0}
              >
                {t.landing.joinButton}
              </Button>
            </div>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          {[
            { icon: "🔒", label: t.landing.featureEncrypted },
            { icon: "⚡", label: t.landing.featureRealtime },
            { icon: "🗑️", label: t.landing.featureAutoDelete },
          ].map((f) => (
            <div key={f.label} className="text-gray-500">
              <div className="text-2xl mb-1">{f.icon}</div>
              <div className="text-xs">{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
