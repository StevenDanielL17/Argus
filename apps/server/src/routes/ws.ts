import type { FastifyInstance } from "fastify";
import { addClient } from "../ws/clientHub.js";

export async function registerWsRoute(app: FastifyInstance): Promise<void> {
  app.get("/ws/client", { websocket: true }, (connection) => {
    addClient(connection);
    connection.send(
      JSON.stringify({
        type: "connected",
        timestamp: Date.now(),
        message: "Connected to Argus signal stream"
      })
    );
  });
}
