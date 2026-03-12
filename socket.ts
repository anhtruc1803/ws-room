import { createServer } from "http";
import { parse } from "url";
import { initSocketServer } from "./realtime/socket-server";

const port = parseInt(process.env.SOCKET_PORT || "3001", 10);

async function main() {
  const httpServer = createServer((req, res) => {
    // Basic health check endpoint for ECS / K8s load balancer
    const parsedUrl = parse(req.url || "", true);
    if (parsedUrl.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "socket" }));
      return;
    }
    
    res.writeHead(404);
    res.end();
  });

  initSocketServer(httpServer);

  httpServer.listen(port, () => {
    console.log(`> Socket.IO Server ready on port ${port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start socket server:", err);
  process.exit(1);
});
