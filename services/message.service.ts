import { prisma } from "@/lib/prisma";

export interface SaveMessageInput {
  roomId: string;
  senderSessionId: string | null;
  type: "text" | "system" | "attachment";
  content: string;
  replyToId?: string;
}

export async function saveMessage(input: SaveMessageInput) {
  const message = await prisma.message.create({
    data: {
      roomId: input.roomId,
      senderSessionId: input.senderSessionId,
      type: input.type,
      content: input.content,
      replyToId: input.replyToId,
    },
    include: {
      replyTo: {
        select: {
          id: true,
          content: true,
          sender: { select: { displayName: true } },
        },
      },
    },
  } as any);

  return message as any;
}

export async function getRecentMessages(roomId: string, limit = 100) {
  return prisma.message.findMany({
    where: { roomId },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: {
      sender: {
        select: { id: true, displayName: true },
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
  } as any);
}
