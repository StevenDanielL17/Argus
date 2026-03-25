import type { FastifyInstance } from "fastify";
import { emitSignal } from "../signals/signalBus.js";
import type { SignalEvent, SignalType, SignalSeverity } from "@argus/shared";

export async function registerTestSignalRoute(app: FastifyInstance) {
  app.post("/api/test-signal", async (req, reply) => {
    const body = req.body as { type?: string; severity?: string; symbol?: string };

    const event: SignalEvent = {
      id: `test-${Date.now()}`,
      type: (body.type ?? "whale") as SignalType,
      severity: (body.severity ?? "critical") as SignalSeverity,
      symbol: body.symbol ?? "SOL",
      message: `🧪 TEST SIGNAL — Demo Mode (${body.type ?? "whale"})`,
      value: 100000,
      timestamp: Date.now(),
    };

    emitSignal(event);
    return reply.send({ ok: true, signal: event });
  });
}
