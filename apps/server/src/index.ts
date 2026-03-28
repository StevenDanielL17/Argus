import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { config } from "./config.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerWsRoute } from "./routes/ws.js";
import { registerTestSignalRoute } from "./routes/test-signal.js";
import { registerExecuteRoute } from "./routes/execute.js";
import { startPacificaFeeds } from "./ws/pacificaFeeds.js";
import { heartbeatCheck } from "./ws/clientHub.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: config.corsOrigin });
await app.register(websocket);

await registerHealthRoute(app);
await registerWsRoute(app);
await registerTestSignalRoute(app);

// Only register execute route if credentials are configured
if (config.pacificaPrivateKey && config.pacificaApiKey) {
  await registerExecuteRoute(app);
  app.log.info("Execution route registered");
} else {
  app.log.warn("Execution disabled - missing credentials");
}

// Start heartbeat check for WebSocket clients
heartbeatCheck(30000, 15000);
app.log.info("WebSocket heartbeat started");

// Start feeds - Pacifica or demo mode
let cleanupFeed: (() => void) | undefined;
if (config.pacificaWsUrl && config.pacificaWsUrl.includes("pacifica")) {
  try {
    cleanupFeed = startPacificaFeeds(config.pacificaWsUrl, {
      symbols: config.symbols,
      depthWindowPct: config.depthWindowPct,
      updateIntervalMs: config.updateIntervalMs
    });
    app.log.info("Pacifica feeds started");
  } catch (error) {
    app.log.warn("Pacifica connection failed, starting demo mode");
    const { startDemoFeed } = await import("./devMockFeed.js");
    cleanupFeed = startDemoFeed();
  }
} else {
  app.log.info("Starting demo mock feeds");
  const { startDemoFeed } = await import("./devMockFeed.js");
  cleanupFeed = startDemoFeed();
}

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
