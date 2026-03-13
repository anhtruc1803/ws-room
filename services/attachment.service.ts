import { prisma } from "@/lib/prisma";
import { getStorage } from "@/storage";
import {
  validateUpload,
  generateStorageKey,
} from "@/lib/upload-validation";
import { AppError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { v4 as uuidv4 } from "uuid";

// ============================================================
// Types
// ============================================================

export interface UploadFileInput {
  roomId: string;
  roomCode: string;
  senderSessionId: string;
  senderDisplayName: string;
  filename: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}

// ============================================================
// Upload File
// ============================================================

export async function uploadFile(input: UploadFileInput) {
  const {
    roomId,
    roomCode,
    senderSessionId,
    senderDisplayName,
    filename,
    mimeType,
    size,
    buffer,
  } = input;

  // Validate
  const validation = validateUpload(filename, mimeType, size);
  if (!validation.valid) {
    throw new AppError(validation.error!);
  }

  // Verify room is active
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room || room.status !== "active") {
    throw new AppError("Room is not active");
  }

  // Generate storage key and upload
  const uniqueId = uuidv4();
  const storageKey = `rooms/${roomCode}/${uniqueId}`;
  
  const storage = getStorage();
  await storage.upload(storageKey, buffer, mimeType);

  // Calculate expiry (same as room expiry + 30 min buffer)
  const expiresAt = new Date(room.expiresAt.getTime() + 30 * 60 * 1000);

  // Create message + attachment in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        roomId,
        senderSessionId,
        type: "attachment",
        content: `uploaded ${filename}`,
      },
    });

    const attachment = await tx.attachment.create({
      data: {
        roomId,
        messageId: message.id,
        filename,
        mimeType,
        size,
        storageKey,
        expiresAt,
      },
    });

    return { message, attachment };
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      roomId,
      actorSessionId: senderSessionId,
      action: "file.uploaded",
      metadata: { filename, mimeType, size },
    },
  });

  return {
    message: {
      id: result.message.id,
      senderSessionId,
      senderName: senderDisplayName,
      type: "attachment" as const,
      content: result.message.content,
      createdAt: result.message.createdAt,
      attachment: {
        id: result.attachment.id,
        filename: result.attachment.filename,
        mimeType: result.attachment.mimeType,
        size: result.attachment.size,
      },
    },
  };
}

// ============================================================
// Get Signed Download URL
// ============================================================

export async function getFileDownloadUrl(
  attachmentId: string,
  sessionId: string
) {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: {
      room: {
        include: {
          participants: {
            where: { id: sessionId },
          },
        },
      },
    },
  });

  if (!attachment) {
    throw new NotFoundError("Attachment not found");
  }

  // Verify user is participant
  if (attachment.room.participants.length === 0) {
    throw new ForbiddenError("You are not a participant of this room");
  }

  // Check expiry
  if (attachment.expiresAt && attachment.expiresAt < new Date()) {
    throw new AppError("This file has expired");
  }

  const storage = getStorage();
  const signedUrl = await storage.getSignedUrl(attachment.storageKey, 300); // 5 min TTL

  // Audit log
  await prisma.auditLog.create({
    data: {
      roomId: attachment.roomId,
      actorSessionId: sessionId,
      action: "file.downloaded",
      metadata: { filename: attachment.filename, attachmentId },
    },
  });

  return {
    url: signedUrl,
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    size: attachment.size,
  };
}
