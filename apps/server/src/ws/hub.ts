import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import jwt from "jsonwebtoken";

type ClientMeta = { userId: string; deviceId?: string };
type AuthedSocket = WebSocket & { meta?: ClientMeta; isAlive?: boolean };

const userSockets = new Map<string, Set<AuthedSocket>>();

export const WsHub = {
  wss: null as WebSocketServer | null,
  heartbeatTimer: null as NodeJS.Timeout | null,

  init(server: any) {
    const wss = new WebSocketServer({ server, path: "/ws" });
    this.wss = wss;

    wss.on("connection", (ws: AuthedSocket, req: IncomingMessage) => {
      try {
        const url = new URL(req.url || "", `http://${req.headers.host}`);
        const token = url.searchParams.get("token") || "";
        const secret = process.env.JWT_SECRET || "dev-secret";
        const payload = jwt.verify(token, secret) as any;
        const userId = payload.sub;
        const deviceId = payload.deviceId;

        ws.meta = { userId, deviceId };
        ws.isAlive = true;

        if (!userSockets.has(userId)) userSockets.set(userId, new Set());
        userSockets.get(userId)!.add(ws);

        ws.on("pong", () => (ws.isAlive = true));
        ws.on("close", () => {
          userSockets.get(userId)?.delete(ws);
        });
      } catch {
        ws.close();
      }
    });

    const interval = setInterval(() => {
      wss.clients.forEach((ws: WebSocket) => {
        const s = ws as AuthedSocket;
        if (!s.isAlive) return s.terminate();
        s.isAlive = false;
        s.ping();
      });
    }, 30000);
    this.heartbeatTimer = interval;

    wss.on("close", () => {
      clearInterval(interval);
      this.heartbeatTimer = null;
      userSockets.clear();
    });
  },

  broadcastToUser(userId: string, payload: any) {
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    const data = JSON.stringify(payload);
    sockets.forEach((s) => {
      if (s.readyState === WebSocket.OPEN) s.send(data);
    });
  },

  async shutdown() {
    const wss = this.wss;
    this.wss = null;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    userSockets.clear();

    if (!wss) return;
    await new Promise<void>((resolve) => {
      wss.close(() => resolve());
    });
  },
};
