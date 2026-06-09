import http from "http";
import { WebSocketServer } from "ws";
import app from "./app";
import { logger } from "./lib/logger";
import { wsClients } from "./lib/wsClients";
import { getSession } from "./lib/session";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);

// WebSocket server for real-time search progress
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", async (req, socket, head) => {
  const url = req.url ?? "";
  const match = url.match(/^\/api\/ws\/search\/([^/?]+)/);

  if (!match) {
    socket.destroy();
    return;
  }

  const searchId = match[1];

  // Authenticate via cookie
  const cookieHeader = req.headers.cookie ?? "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k.trim(), v.join("=")];
    })
  );
  const sessionId = cookies["alpha_session"];

  if (!sessionId) {
    socket.destroy();
    return;
  }

  const session = await getSession(sessionId);
  if (!session) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    if (!wsClients.has(searchId)) {
      wsClients.set(searchId, new Set());
    }
    wsClients.get(searchId)!.add(ws);

    ws.on("close", () => {
      wsClients.get(searchId)?.delete(ws);
      if (wsClients.get(searchId)?.size === 0) {
        wsClients.delete(searchId);
      }
    });
  });
});

server.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
