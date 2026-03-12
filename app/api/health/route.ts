import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export async function GET() {
  const health: Record<string, string> = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.database = "connected";
  } catch {
    health.database = "disconnected";
  }

  // Check Redis
  try {
    await redis.ping();
    health.redis = "connected";
  } catch {
    health.redis = "disconnected";
  }

  const isHealthy = health.database === "connected" && health.redis === "connected";

  return NextResponse.json(health, {
    status: isHealthy ? 200 : 503,
  });
}
