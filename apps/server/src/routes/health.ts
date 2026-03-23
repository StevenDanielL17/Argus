import type { FastifyInstance } from "fastify";
import { clientCount } from "../ws/clientHub.js";

export async function registerHealthRoute(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => ({
    ok: true,
    service: "argus-server",
    clients: clientCount(),
    timestamp: Date.now()
  }));
}
