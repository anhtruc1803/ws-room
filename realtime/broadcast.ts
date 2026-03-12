import { getIO } from "./socket-server";

/**
 * Broadcast room-ended event to all connected clients in a room.
 * Called from endRoom service.
 */
export function broadcastRoomEnded(roomCode: string) {
  try {
    const io = getIO();
    io.to(`room:${roomCode}`).emit("room-ended", {});
    // Disconnect all sockets from this room
    io.in(`room:${roomCode}`).socketsLeave(`room:${roomCode}`);
  } catch {
    // Socket.IO may not be initialized in API-only contexts
    console.warn("[Broadcast] Socket.IO not available, skipping broadcast");
  }
}

/**
 * Broadcast a system message to a room.
 */
export function broadcastSystemMessage(
  roomCode: string,
  content: string,
  messageData?: Record<string, unknown>
) {
  try {
    const io = getIO();
    io.to(`room:${roomCode}`).emit("new-message", {
      senderSessionId: null,
      senderName: null,
      type: "system",
      content,
      createdAt: new Date().toISOString(),
      ...messageData,
    });
  } catch {
    console.warn("[Broadcast] Socket.IO not available, skipping broadcast");
  }
}

/**
 * Broadcast a new attachment message to all clients in a room.
 * Called after file upload via HTTP API.
 */
export function broadcastAttachmentMessage(
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
  try {
    const io = getIO();
    io.to(`room:${roomCode}`).emit("new-message", {
      ...message,
      createdAt:
        message.createdAt instanceof Date
          ? message.createdAt.toISOString()
          : message.createdAt,
    });
  } catch {
    console.warn("[Broadcast] Socket.IO not available, skipping broadcast");
  }
}
