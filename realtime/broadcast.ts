import { getIO } from "./socket-server";
import { redis } from "@/lib/redis";

/**
 * Broadcast room-ended event to all connected clients in a room.
 * Called from endRoom service.
 */
export async function broadcastRoomEnded(roomCode: string) {
  try {
    const io = getIO();
    io.to(`room:${roomCode}`).emit("room-ended", {});
    // Disconnect all sockets from this room
    io.in(`room:${roomCode}`).socketsLeave(`room:${roomCode}`);
  } catch {
    // Publish to Redis for socket server to handle
    await redis.publish("socket-broadcast", JSON.stringify({
      roomCode,
      event: "room-ended",
    }));
  }
}

/**
 * Broadcast a system message to a room.
 */
export async function broadcastSystemMessage(
  roomCode: string,
  content: string,
  messageData?: Record<string, unknown>
) {
  const payload = {
    senderSessionId: null,
    senderName: null,
    type: "system",
    content,
    createdAt: new Date().toISOString(),
    ...messageData,
  };
  try {
    const io = getIO();
    io.to(`room:${roomCode}`).emit("new-message", payload);
  } catch {
    await redis.publish("socket-broadcast", JSON.stringify({
      roomCode,
      event: "new-message",
      payload,
    }));
  }
}

/**
 * Broadcast a new attachment message to all clients in a room.
 * Called after file upload via HTTP API.
 */
export async function broadcastAttachmentMessage(
  roomCode: string,
  message: {
    id: string;
    senderSessionId: string;
    senderName: string;
    type: string;
    content: string;
    createdAt: Date | string;
    attachment: {
      id: string;
      filename: string;
      mimeType: string;
      size: number;
    };
  }
) {
  const payload = {
    ...message,
    createdAt:
      message.createdAt instanceof Date
        ? message.createdAt.toISOString()
        : message.createdAt,
  };

  try {
    const io = getIO();
    io.to(`room:${roomCode}`).emit("new-message", payload);
  } catch {
    await redis.publish("socket-broadcast", JSON.stringify({
      roomCode,
      event: "new-message",
      payload,
    }));
  }
}
