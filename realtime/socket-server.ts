import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { saveMessage } from "@/services/message.service";
import { sanitizeContent } from "@/lib/sanitize";

// ============================================================
// Types
// ============================================================

interface AuthenticatedSocket extends Socket {
  data: {
    sessionId: string;
    roomId: string;
    roomCode: string;
    displayName: string;
    role: string;
  };
}

// ============================================================
// Socket.IO Server Init
// ============================================================

let io: Server | null = null;

export function getIO(): Server {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

export function initSocketServer(httpServer: HttpServer): Server {
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow configured origin, no-origin (same-origin/server), and localhost variants
        if (
          !origin ||
          origin === allowedOrigin ||
          origin.includes("localhost") ||
          origin.includes("127.0.0.1") ||
          process.env.NODE_ENV !== "production"
        ) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin ${origin} not allowed`));
        }
      },
      methods: ["GET", "POST"],
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Attach Redis Adapter
  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  // Listen for broadcast events from HTTP APIs
  const externalSubClient = redis.duplicate();
  externalSubClient.subscribe("socket-broadcast");
  externalSubClient.on("message", (channel, messageStr) => {
    if (channel === "socket-broadcast" && io) {
      try {
        const data = JSON.parse(messageStr);
        if (data.event === "new-message") {
          io.to(`room:${data.roomCode}`).emit("new-message", data.payload);
        } else if (data.event === "room-ended") {
          io.to(`room:${data.roomCode}`).emit("room-ended", {});
          io.in(`room:${data.roomCode}`).socketsLeave(`room:${data.roomCode}`);
        }
      } catch (err) {
        console.error("[Socket] Broadcast parse error:", err);
      }
    }
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ── Authenticate ──────────────────────────────────────
    socket.on("authenticate", async (data: { token: string }) => {
      try {
        const session = await prisma.participantSession.findUnique({
          where: { sessionToken: data.token },
          include: { room: true },
        });

        if (!session || !session.isActive) {
          socket.emit("error", { message: "Invalid or expired session" });
          return;
        }

        if (session.room.status !== "active") {
          socket.emit("error", { message: "Room is no longer active" });
          return;
        }

        // Store session data on socket
        const authSocket = socket as AuthenticatedSocket;
        authSocket.data = {
          sessionId: session.id,
          roomId: session.roomId,
          roomCode: session.room.roomCode,
          displayName: session.displayName,
          role: session.role,
        };

        socket.emit("authenticated", {
          participant: {
            id: session.id,
            displayName: session.displayName,
            role: session.role,
          },
        });

        console.log(
          `[Socket] Authenticated: ${session.displayName} (${session.role})`
        );
      } catch (err) {
        console.error("[Socket] Auth error:", err);
        socket.emit("error", { message: "Authentication failed" });
      }
    });

    // ── Join Room ─────────────────────────────────────────
    socket.on("join-room", async () => {
      const s = socket as AuthenticatedSocket;
      if (!s.data?.sessionId) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }

      const socketRoom = `room:${s.data.roomCode}`;
      await socket.join(socketRoom);

      // Create system message
      const sysMsg = await saveMessage({
        roomId: s.data.roomId,
        senderSessionId: null,
        type: "system",
        content: `${s.data.displayName} joined the room`,
      });

      // Broadcast to room
      io!.to(socketRoom).emit("user-joined", {
        participant: {
          id: s.data.sessionId,
          displayName: s.data.displayName,
          role: s.data.role,
        },
        message: sysMsg,
      });

      // Send current participants list
      const participants = await prisma.participantSession.findMany({
        where: { roomId: s.data.roomId, isActive: true },
        select: { id: true, displayName: true, role: true, joinedAt: true },
      });

      socket.emit("participants-list", { participants });

      console.log(
        `[Socket] ${s.data.displayName} joined room ${s.data.roomCode}`
      );
    });

    // ── Send Message ──────────────────────────────────────
    socket.on(
      "send-message",
      async (data: { content: string; type?: string }) => {
        const s = socket as AuthenticatedSocket;
        if (!s.data?.sessionId) {
          socket.emit("error", { message: "Not authenticated" });
          return;
        }

        // Check if room is still active and not expired
        try {
          const room = await prisma.room.findUnique({
            where: { id: s.data.roomId },
            select: { status: true, expiresAt: true },
          });

          if (!room || room.status !== "active" || room.expiresAt < new Date()) {
            socket.emit("error", { message: "Room has expired or ended" });
            socket.emit("room-ended");
            return;
          }
        } catch (err) {
          console.error("[Socket] Room check error:", err);
          socket.emit("error", { message: "Failed to verify room status" });
          return;
        }

        // Rate limit: max 30 messages per minute per user via Redis
        const now = Date.now();
        const key = `ratelimit:socket:${s.data.sessionId}`;
        
        try {
          const multi = redis.multi();
          multi.zadd(key, now, now.toString()); // add current timestamp
          multi.zremrangebyscore(key, 0, now - 60000); // remove entries older than 1 minute
          multi.zcard(key); // count remaining entries
          multi.expire(key, 60); // set expiry
          
          const results = await multi.exec();
          const count = results?.[2]?.[1] as number;

          if (count > 30) {
            socket.emit("error", { message: "Rate limit exceeded. Slow down." });
            return;
          }
        } catch (err) {
          console.error("[Socket] Redis rate limit error:", err);
        }

        const content = sanitizeContent(data.content || "");
        if (!content) {
          socket.emit("error", { message: "Message content is empty" });
          return;
        }

        try {
          const message = await saveMessage({
            roomId: s.data.roomId,
            senderSessionId: s.data.sessionId,
            type: "text",
            content,
          });

          const socketRoom = `room:${s.data.roomCode}`;
          io!.to(socketRoom).emit("new-message", {
            id: message.id,
            senderSessionId: s.data.sessionId,
            senderName: s.data.displayName,
            type: "text",
            content: message.content,
            createdAt: message.createdAt,
          });
        } catch (err) {
          console.error("[Socket] Message error:", err);
          socket.emit("error", { message: "Failed to send message" });
        }
      }
    );

    // ── Typing Indicator ─────────────────────────────────
    socket.on("typing", () => {
      const s = socket as AuthenticatedSocket;
      if (!s.data?.sessionId) return;
      const socketRoom = `room:${s.data.roomCode}`;
      socket.to(socketRoom).emit("user-typing", {
        displayName: s.data.displayName,
      });
    });

    // ── Leave Room ────────────────────────────────────────
    socket.on("leave-room", async () => {
      await handleLeave(socket as AuthenticatedSocket);
    });

    // ── Disconnect ────────────────────────────────────────
    socket.on("disconnect", async (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
      await handleLeave(socket as AuthenticatedSocket);
    });
  });

  return io;
}

// ============================================================
// Handle user leaving
// ============================================================

async function handleLeave(socket: AuthenticatedSocket) {
  if (!socket.data?.sessionId) return;

  const socketRoom = `room:${socket.data.roomCode}`;

  try {
    // Update session
    await prisma.participantSession.update({
      where: { id: socket.data.sessionId },
      data: { isActive: false, leftAt: new Date() },
    });

    // System message
    const sysMsg = await saveMessage({
      roomId: socket.data.roomId,
      senderSessionId: null,
      type: "system",
      content: `${socket.data.displayName} left the room`,
    });

    // Broadcast
    io?.to(socketRoom).emit("user-left", {
      participant: {
        id: socket.data.sessionId,
        displayName: socket.data.displayName,
      },
      message: sysMsg,
    });

    socket.leave(socketRoom);
    console.log(
      `[Socket] ${socket.data.displayName} left room ${socket.data.roomCode}`
    );
  } catch (err) {
    console.error("[Socket] Leave error:", err);
  }
}
