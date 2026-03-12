import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";
import { AppError, UnauthorizedError } from "./errors";
import type { ParticipantSession } from "@prisma/client";

/** Standard API error response */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  console.error("Unexpected error:", error);
  return NextResponse.json(
    { error: "Internal server error", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}

/** Extract and validate session token from Authorization header */
export async function authenticateRequest(
  request: NextRequest
): Promise<ParticipantSession> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid authorization header");
  }

  const token = authHeader.slice(7);
  const session = await prisma.participantSession.findUnique({
    where: { sessionToken: token },
  });

  if (!session || !session.isActive) {
    throw new UnauthorizedError("Invalid or expired session");
  }

  return session;
}
