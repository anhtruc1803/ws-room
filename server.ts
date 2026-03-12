import { createServer } from "http";
import next from "next";
import { initSocketServer } from "./realtime/socket-server";
import { startWorkers } from "./jobs";
import { scheduleRepeatableJobs } from "./lib/queue";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  httpServer.listen(port, () => {
    console.log(`> App Web Server ready on http://${hostname}:${port}`);
    console.log(`> Environment: ${dev ? "development" : "production"}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
