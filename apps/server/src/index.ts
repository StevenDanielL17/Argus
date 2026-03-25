import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { config } from "./config.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerWsRoute } from "./routes/ws.js";
import { startPacificaFeeds } from "./ws/pacificaFeeds.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(websocket);

await registerHealthRoute(app);
await registerWsRoute(app);

const cleanupFeed = startPacificaFeeds(config.pacificaWsUrl, {
  symbols: config.symbols,
  depthWindowPct: config.depthWindowPct,
  updateIntervalMs: config.updateIntervalMs
});

try {
  await app.listen({ port: config.port, host: "0.0.0.0" });
  app.log.info(`Argus server listening on port ${config.port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

process.on("SIGINT", async () => {
  if (cleanupFeed) cleanupFeed();
  await app.close();
  process.exit(0);
});
