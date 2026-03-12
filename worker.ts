import { startWorkers } from "./jobs";
import { scheduleRepeatableJobs } from "./lib/queue";

async function main() {
  console.log(`> Starting Background Workers...`);
  startWorkers();
  await scheduleRepeatableJobs();
  console.log(`> Resumed BullMQ tracking.`);
}

main().catch((err) => {
  console.error("Failed to start workers:", err);
  process.exit(1);
});
