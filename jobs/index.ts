import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import {
  scanAndLockExpiredRooms,
  scanAndDeleteExpiredRooms,
  deleteRoomData,
} from "@/services/cleanup.service";
import { scheduleRoomDeletion } from "@/lib/queue";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
}) as never;

let worker: Worker | null = null;

/**
 * Start the room lifecycle worker.
 * Handles: scan-expired, scan-deletable, delete-room
 */
export function startWorkers(): void {
  if (worker) {
    console.log("[Jobs] Workers already running.");
    return;
  }

  worker = new Worker(
    "room-lifecycle",
    async (job: Job) => {
      switch (job.name) {
        case "scan-expired": {
          console.log("[Job] Scanning for expired rooms...");
          const lockedIds = await scanAndLockExpiredRooms();
          if (lockedIds.length > 0) {
            console.log(`[Job] Locked ${lockedIds.length} expired room(s).`);
            // Schedule delayed deletion for each locked room
            for (const roomId of lockedIds) {
              await scheduleRoomDeletion(roomId);
            }
          }
          return { locked: lockedIds.length };
        }

        case "scan-deletable": {
          console.log("[Job] Scanning for deletable rooms...");
          const deleted = await scanAndDeleteExpiredRooms();
          if (deleted > 0) {
            console.log(`[Job] Deleted ${deleted} room(s).`);
          }
          return { deleted };
        }

        case "delete-room": {
          const { roomId } = job.data as { roomId: string };
          console.log(`[Job] Deleting room ${roomId}...`);
          await deleteRoomData(roomId);
          return { roomId, deleted: true };
        }

        default:
          console.warn(`[Job] Unknown job name: ${job.name}`);
      }
    },
    {
      connection,
      concurrency: 3,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[Job] ${job.name} completed (${job.id})`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Job] ${job?.name} failed (${job?.id}):`, err.message);
  });

  console.log("[Jobs] Room lifecycle worker started.");
}
