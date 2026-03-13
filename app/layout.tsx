import type { Metadata } from "next";
import { I18nProvider } from "@/components/providers/I18nProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "War Room - Incident Support",
  description: "Ephemeral incident collaboration tool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-950 text-gray-100 antialiased min-h-screen">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
