import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import {
  generateRoomCode,
  generateSessionToken,
  hashPassword,
  verifyPassword,
} from "@/lib/crypto";
import { NotFoundError, AppError, ForbiddenError } from "@/lib/errors";
import { broadcastRoomEnded } from "@/realtime/broadcast";
import { scheduleRoomDeletion } from "@/lib/queue";

// ============================================================
// Types
// ============================================================

export interface CreateRoomInput {
  title: string;
  description?: string;
  durationMinutes: number; // room TTL in minutes
  password?: string;
  createdByName: string;
}

export interface JoinRoomInput {
  displayName: string;
  password?: string;
}

// ============================================================
// Create Room
// ============================================================

export async function createRoom(input: CreateRoomInput) {
  const { title, description, durationMinutes, password, createdByName } = input;

  if (!title || title.trim().length === 0) {
    throw new AppError("Title is required");
  }
  if (durationMinutes < 15 || durationMinutes > 1440) {
    throw new AppError("Duration must be between 15 minutes and 24 hours");
  }
  if (createdByName.trim().length === 0) {
    throw new AppError("Display name is required");
  }

  // Generate unique room code with retry
  let roomCode: string;
  let attempts = 0;
  do {
    roomCode = generateRoomCode();
    const existing = await prisma.room.findUnique({ where: { roomCode } });
    if (!existing) break;
    attempts++;
  } while (attempts < 5);

  if (attempts >= 5) {
    throw new AppError("Failed to generate unique room code", 500);
  }

  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
  const sessionToken = generateSessionToken();

  const room = await prisma.room.create({
    data: {
      roomCode,
      title: title.trim(),
      description: description?.trim() || null,
      securityLevel: password ? "password" : "open",
      passwordHash: password ? hashPassword(password) : null,
      createdByName: createdByName.trim(),
      expiresAt,
      participants: {
        create: {
          displayName: createdByName.trim(),
          role: "owner",
          sessionToken,
        },
      },
      auditLogs: {
        create: {
          action: "room.created",
          metadata: { title: title.trim() },
        },
      },
    },
    include: {
      participants: true,
    },
  });

  // Cache room status in Redis for fast lookup
  await redis.setex(`room:${roomCode}:status`, durationMinutes * 60, "active");

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/join/${roomCode}`;

  return {
    room: {
      id: room.id,
      roomCode: room.roomCode,
      title: room.title,
      description: room.description,
      status: room.status,
      securityLevel: room.securityLevel,
      expiresAt: room.expiresAt,
      createdAt: room.createdAt,
    },
    inviteLink,
    sessionToken,
  };
}

// ============================================================
// Join Room
// ============================================================

export async function joinRoom(roomCode: string, input: JoinRoomInput) {
  const { displayName, password } = input;

  if (!displayName || displayName.trim().length === 0) {
    throw new AppError("Display name is required");
  }

  const room = await prisma.room.findUnique({
    where: { roomCode },
  });

  if (!room) {
    throw new NotFoundError("Room not found");
  }

  if (room.status !== "active") {
    throw new AppError("Room is no longer active");
  }

  if (room.expiresAt < new Date()) {
    throw new AppError("Room has expired");
  }

  // Check password if required
  if (room.securityLevel === "password") {
    if (!password) {
      throw new AppError("Password is required for this room", 401);
    }
    if (!room.passwordHash || !verifyPassword(password, room.passwordHash)) {
      throw new AppError("Incorrect password", 401);
    }
  }

  const sessionToken = generateSessionToken();

  const session = await prisma.participantSession.create({
    data: {
      roomId: room.id,
      displayName: displayName.trim(),
      role: "member",
      sessionToken,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      roomId: room.id,
      actorSessionId: session.id,
      action: "user.joined",
      metadata: { displayName: displayName.trim() },
    },
  });

  return {
    room: {
      id: room.id,
      roomCode: room.roomCode,
      title: room.title,
      description: room.description,
      status: room.status,
      expiresAt: room.expiresAt,
    },
    sessionToken,
    participant: {
      id: session.id,
      displayName: session.displayName,
      role: session.role,
    },
  };
}

// ============================================================
// Get Room Info
// ============================================================

export async function getRoomInfo(roomCode: string, sessionId: string) {
  const room = await (prisma.room.findUnique as any)({
    where: { roomCode },
    include: {
      participants: {
        where: { isActive: true },
        select: {
          id: true,
          displayName: true,
          role: true,
          joinedAt: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 100, // last 100 messages
        select: {
          id: true,
          senderSessionId: true,
          type: true,
          content: true,
          createdAt: true,
          sender: {
            select: { displayName: true },
          },
          attachment: {
            select: {
              id: true,
              filename: true,
              mimeType: true,
              size: true,
            },
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              sender: { select: { displayName: true } },
            },
          },
          readBy: {
            select: {
              readerId: true,
              reader: { select: { displayName: true } },
            },
          },
          reactions: {
            select: {
              emoji: true,
              reacterId: true,
              reacter: { select: { displayName: true } },
            },
          },
        },
      },
    },
  });

  if (!room) {
    throw new NotFoundError("Room not found");
  }

  // Verify the session belongs to this room
  const participant = room.participants.find((p: any) => p.id === sessionId);
  if (!participant) {
    throw new ForbiddenError("You are not a participant of this room");
  }

  return {
    room: {
      id: room.id,
      roomCode: room.roomCode,
      title: room.title,
      description: room.description,
      status: room.status,
      securityLevel: room.securityLevel,
      expiresAt: room.expiresAt,
      resolvedAt: room.resolvedAt,
      createdAt: room.createdAt,
    },
    participants: room.participants,
    messages: room.messages.reverse().map((m: any) => ({
      id: m.id,
      senderSessionId: m.senderSessionId,
      senderName: m.sender?.displayName || null,
      type: m.type,
      content: m.content,
      createdAt: m.createdAt,
      attachment: m.attachment,
      replyTo: m.replyTo
        ? {
            id: m.replyTo.id,
            content: m.replyTo.content,
            sender: m.replyTo.sender,
          }
        : null,
      readBy: (m.readBy || []).map((r: any) => ({
        readerId: r.readerId,
        readerName: r.reader?.displayName || "?",
      })),
      reactions: (m.reactions || []).map((r: any) => ({
        emoji: r.emoji,
        reacterId: r.reacterId,
        reacterName: r.reacter?.displayName || "?",
      })),
    })),
  };
}

// ============================================================
// End Room (lock)
// ============================================================

export async function endRoom(roomCode: string, sessionId: string) {
  const room = await prisma.room.findUnique({
    where: { roomCode },
    include: {
      participants: {
        where: { id: sessionId },
      },
    },
  });

  if (!room) {
    throw new NotFoundError("Room not found");
  }

  if (room.status !== "active") {
    throw new AppError("Room is already ended");
  }

  const participant = room.participants[0];
  if (!participant || participant.role !== "owner") {
    throw new ForbiddenError("Only the room owner can end the room");
  }

  const deleteAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min after lock

  const updated = await prisma.room.update({
    where: { id: room.id },
    data: {
      status: "locked",
      resolvedAt: new Date(),
      deleteAt,
    },
  });

  // Mark all participants as inactive
  await prisma.participantSession.updateMany({
    where: { roomId: room.id, isActive: true },
    data: { isActive: false, leftAt: new Date() },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      roomId: room.id,
      actorSessionId: sessionId,
      action: "room.ended",
      metadata: { deleteAt: deleteAt.toISOString() },
    },
  });

  // Clear Redis cache
  await redis.del(`room:${roomCode}:status`);

  // Broadcast room ended to all connected clients
  broadcastRoomEnded(roomCode);

  // Schedule delayed hard-delete (30 min)
  await scheduleRoomDeletion(room.id);

  return {
    room: {
      id: updated.id,
      roomCode: updated.roomCode,
      title: updated.title,
      status: updated.status,
      resolvedAt: updated.resolvedAt,
      deleteAt: updated.deleteAt,
    },
  };
}
