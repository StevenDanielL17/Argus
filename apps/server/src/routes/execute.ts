import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { OrderBuilder, OrderIntent } from "../execution/orderBuilder.js";
import { PacificaClient } from "../execution/pacificaClient.js";
import { IdempotencyManager } from "../execution/idempotencyManager.js";
import { config } from "../config.js";

// In-memory idempotency store (5 minute TTL)
const idempotencyManager = new IdempotencyManager(300_000);

// Rate limiting: track requests per IP
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute

export async function registerExecuteRoute(app: FastifyInstance) {
  const orderBuilder = new OrderBuilder();
  const pacificaClient = new PacificaClient();

  // Rate limiting pre-handler
  app.addHook("preHandler", async (request, reply) => {
    const ip = request.ip || "unknown";
    const now = Date.now();
    const record = rateLimitStore.get(ip);

    if (!record || now > record.resetAt) {
      // New window
      rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    } else {
      // Existing window
      if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
        return reply.status(429).send({
          error: "Rate limit exceeded",
          retryAfter: Math.ceil((record.resetAt - now) / 1000),
        });
      }
      record.count++;
    }
  });

  app.post<{ Body: OrderIntent }>("/api/execute", async (request: FastifyRequest<{ Body: OrderIntent }>, reply: FastifyReply) => {
    const orderIntent = request.body;
    const idempotencyKey = request.headers["x-idempotency-key"] as string | undefined;

    // Validate order intent
    if (!orderIntent.symbol || !orderIntent.side || !orderIntent.quantity) {
      return reply.status(400).send({ error: "Missing required fields: symbol, side, quantity" });
    }

    // Check idempotency cache
    if (idempotencyKey) {
      const cached = idempotencyManager.get(idempotencyKey);
      if (cached) {
        app.log.info(`[Execute] Returning cached response for idempotency key: ${idempotencyKey}`);
        return reply.status(cached.status).send(cached.response);
      }
    }

    // Build order with builder code
    const builtOrder = orderBuilder.build(orderIntent);

    // Execute order via Pacifica
    const result = await pacificaClient.executeOrder(builtOrder, idempotencyKey);

    const statusCode = result.success ? 200 : 500;
    const response = result;

    // Cache the response if we have an idempotency key
    if (idempotencyKey) {
      idempotencyManager.set(idempotencyKey, response, statusCode);
    }

    if (!result.success) {
      return reply.status(statusCode).send(response);
    }

    return reply.status(statusCode).send(response);
  });
}
