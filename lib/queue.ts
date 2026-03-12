import { Queue } from "bullmq";
import IORedis from "ioredis";

// BullMQ needs its own Redis connection (not shared with app cache)
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
}) as never; // cast to avoid ioredis version mismatch with BullMQ's bundled version

const defaultJobOptions = {
  removeOnComplete: 100,
  removeOnFail: 500,
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 1000,
  },
};

/**
 * Room lifecycle queue.
 * Jobs:
 *   - "scan-expired"   (repeatable every 1 min) → lock expired rooms
 *   - "scan-deletable"  (repeatable every 5 min) → hard-delete rooms past deleteAt
 *   - "delete-room"     (delayed) → delete a specific room's data
 */
export const roomQueue = new Queue("room-lifecycle", {
  connection,
  defaultJobOptions,
});

/**
 * Schedule repeatable jobs. Idempotent — BullMQ deduplicates by repeat key.
 */
export async function scheduleRepeatableJobs(): Promise<void> {
  // Scan for expired active rooms every 1 minute
  await roomQueue.add(
    "scan-expired",
    {},
    {
      repeat: { every: 60_000 }, // 1 minute
      jobId: "scan-expired-rooms",
    }
  );

  // Safety net: scan for rooms past deleteAt every 5 minutes
  await roomQueue.add(
    "scan-deletable",
    {},
    {
      repeat: { every: 300_000 }, // 5 minutes
      jobId: "scan-deletable-rooms",
    }
  );

  console.log("[Queue] Repeatable jobs scheduled.");
}

/**
 * Schedule a delayed job to delete a specific room.
 * Called when a room is locked (either manually or by expiry).
 */
export async function scheduleRoomDeletion(
  roomId: string,
  delayMs: number = 30 * 60 * 1000 // default 30 min
): Promise<void> {
  await roomQueue.add(
    "delete-room",
    { roomId },
    {
      delay: delayMs,
      jobId: `delete-room-${roomId}`,
    }
  );
  console.log(
    `[Queue] Room ${roomId} deletion scheduled in ${delayMs / 1000}s.`
  );
}
