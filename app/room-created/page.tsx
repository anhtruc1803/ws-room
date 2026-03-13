"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/useToast";

function RoomCreatedContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useTranslation();
  const { toast } = useToast();

  const code = params.get("code") || "";
  const title = params.get("title") || "";

  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join/${code}`
    : "";

  // Redirect if no code
  useEffect(() => {
    if (!code) router.replace("/create");
  }, [code, router]);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    toast(t.roomCreated.codeCopied, "success");
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setLinkCopied(true);
    toast(t.roomHeader.linkCopied, "success");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (!code) return null;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="max-w-md w-full text-center animate-[scaleIn_0.3s_ease-out]">
        {/* Success icon */}
        <div className="w-16 h-16 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <Logo size="lg" />

        <h1 className="text-2xl font-bold text-gray-100 mt-4">{t.roomCreated.title}</h1>
        {title && <p className="text-gray-400 mt-1">{title}</p>}
        <p className="text-sm text-gray-500 mt-2">{t.roomCreated.subtitle}</p>

        {/* Room code */}
        <div className="mt-6 bg-gray-900 border border-gray-700 rounded-xl p-6">
          <p className="text-4xl font-mono font-bold text-white tracking-[0.3em] select-all">
            {code}
          </p>

          <div className="mt-4 flex gap-3">
            <Button
              variant={codeCopied ? "primary" : "secondary"}
              className="flex-1"
              onClick={copyCode}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {codeCopied ? t.roomInfo.copied : t.roomCreated.copyCode}
            </Button>
            <Button
              variant={linkCopied ? "primary" : "secondary"}
              className="flex-1"
              onClick={copyLink}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {linkCopied ? t.roomInfo.copied : t.roomCreated.copyLink}
            </Button>
          </div>
        </div>

        {/* Enter room */}
        <Button
          variant="primary"
          className="w-full mt-4"
          onClick={() => router.push(`/room/${code}`)}
        >
          {t.roomCreated.enterRoom} →
        </Button>
      </div>
    </div>
  );
}

export default function RoomCreatedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-16 h-16 rounded-full border-4 border-gray-800 border-t-red-600 animate-spin" />
      </div>
    }>
      <RoomCreatedContent />
    </Suspense>
  );
}
