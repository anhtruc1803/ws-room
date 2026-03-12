import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { getStorage } from "@/storage";
import { broadcastRoomEnded } from "@/realtime/broadcast";

// ============================================================
// Scan & Lock Expired Rooms
// ============================================================

/**
 * Find all active rooms whose expiresAt has passed, then lock them.
 * Called by the repeatable "scan-expired-rooms" job every minute.
 * Returns array of room IDs that were locked.
 */
export async function scanAndLockExpiredRooms(): Promise<string[]> {
  const now = new Date();

  // Find active rooms past their expiry
  const expiredRooms = await prisma.room.findMany({
    where: {
      status: "active",
      expiresAt: { lt: now },
    },
    select: { id: true, roomCode: true, title: true },
  });

  if (expiredRooms.length === 0) return [];

  const lockedIds: string[] = [];

  for (const room of expiredRooms) {
    try {
      // 30 min grace period before hard delete
      const deleteAt = new Date(now.getTime() + 30 * 60 * 1000);

      await prisma.room.update({
        where: { id: room.id, status: "active" }, // optimistic lock
        data: {
          status: "locked",
          resolvedAt: now,
          deleteAt,
        },
      });

      // Deactivate all participants
      await prisma.participantSession.updateMany({
        where: { roomId: room.id, isActive: true },
        data: { isActive: false, leftAt: now },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          roomId: room.id,
          action: "room.expired",
          metadata: {
            title: room.title,
            deleteAt: deleteAt.toISOString(),
          },
        },
      });

      // Clear Redis cache
      await redis.del(`room:${room.roomCode}:status`);

      // Notify connected clients
      broadcastRoomEnded(room.roomCode);

      lockedIds.push(room.id);

      console.log(
        `[Cleanup] Room ${room.roomCode} (${room.title}) expired → locked. Delete at ${deleteAt.toISOString()}`
      );
    } catch (error) {
      // If update fails (e.g. already locked by another worker), skip
      console.warn(
        `[Cleanup] Failed to lock room ${room.roomCode}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  return lockedIds;
}

// ============================================================
// Delete Room Data
// ============================================================

/**
 * Hard-delete all data for a single room.
 * Order: storage files → attachments → messages → sessions → audit → room
 * Called by the delayed "delete-room" job.
 */
export async function deleteRoomData(roomId: string): Promise<void> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, roomCode: true, status: true, deleteAt: true },
  });

  if (!room) {
    console.log(`[Cleanup] Room ${roomId} already deleted, skipping.`);
    return;
  }

  // Safety check: only delete rooms that are locked and past deleteAt
  if (room.status === "active") {
    console.warn(`[Cleanup] Room ${room.roomCode} is still active, skipping.`);
    return;
  }

  if (room.deleteAt && room.deleteAt > new Date()) {
    console.warn(
      `[Cleanup] Room ${room.roomCode} deleteAt is in the future, skipping.`
    );
    return;
  }

  console.log(`[Cleanup] Deleting all data for room ${room.roomCode}...`);

  // Step 1: Delete storage files
  const attachments = await prisma.attachment.findMany({
    where: { roomId: room.id },
    select: { storageKey: true },
  });

  if (attachments.length > 0) {
    const storage = getStorage();
    const keys = attachments.map((a) => a.storageKey);
    try {
      await storage.deleteMany(keys);
      console.log(`[Cleanup] Deleted ${keys.length} storage files.`);
    } catch (error) {
      console.error(
        `[Cleanup] Error deleting storage files:`,
        error instanceof Error ? error.message : error
      );
      // Continue with DB cleanup even if storage fails
    }
  }

  // Step 2-5: Delete DB records in correct FK order
  // Using transaction for atomicity
  await prisma.$transaction(async (tx) => {
    // Attachments (depends on message)
    const delAttachments = await tx.attachment.deleteMany({
      where: { roomId: room.id },
    });
    console.log(`[Cleanup] Deleted ${delAttachments.count} attachments.`);

    // Messages (depends on room, session)
    const delMessages = await tx.message.deleteMany({
      where: { roomId: room.id },
    });
    console.log(`[Cleanup] Deleted ${delMessages.count} messages.`);

    // Audit logs
    const delLogs = await tx.auditLog.deleteMany({
      where: { roomId: room.id },
    });
    console.log(`[Cleanup] Deleted ${delLogs.count} audit logs.`);

    // Participant sessions
    const delSessions = await tx.participantSession.deleteMany({
      where: { roomId: room.id },
    });
    console.log(`[Cleanup] Deleted ${delSessions.count} sessions.`);

    // Finally, the room itself
    await tx.room.delete({ where: { id: room.id } });
    console.log(`[Cleanup] Room ${room.roomCode} fully deleted.`);
  });

  // Clear any remaining Redis keys
  await redis.del(`room:${room.roomCode}:status`);
}

// ============================================================
// Scan & Delete Rooms Past deleteAt
// ============================================================

/**
 * Find all locked rooms past their deleteAt timestamp and delete them.
 * This is a catch-all for rooms whose delayed delete job may have failed.
 * Called by the repeatable "scan-deletable-rooms" job.
 */
export async function scanAndDeleteExpiredRooms(): Promise<number> {
  const now = new Date();

  const deletableRooms = await prisma.room.findMany({
    where: {
      status: "locked",
      deleteAt: { lt: now },
    },
    select: { id: true, roomCode: true },
  });

  if (deletableRooms.length === 0) return 0;

  let deleted = 0;
  for (const room of deletableRooms) {
    try {
      await deleteRoomData(room.id);
      deleted++;
    } catch (error) {
      console.error(
        `[Cleanup] Failed to delete room ${room.roomCode}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  return deleted;
}
