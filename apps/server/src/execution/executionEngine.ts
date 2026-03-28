/**
 * Core execution engine — orchestrates the full order pipeline:
 *
 * 1. Validate intent (Zod)
 * 2. Check idempotency cache
 * 3. Map intent → Pacifica order params
 * 4. Build signed request
 * 5. If testnet → return simulated result
 * 6. If live → send with retry logic
 * 7. Map response → ExecutionResult
 */

import { z } from "zod";
import type {
  OrderIntent,
  ExecutionResult,
  ExecutionError,
  ExecutionErrorCode,
} from "@argus/shared";
import { config } from "../config.js";
import { mapOrderIntent } from "./orderMapper.js";
import { sendSignedRequest } from "./requestBuilder.js";

// ── Zod validation schema ──

const OrderIntentSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  side: z.enum(["buy", "sell"]),
  type: z.enum(["market", "limit"]),
  quantity: z.string().min(1, "Quantity is required"),
  price: z.string().optional(),
  slippageBps: z.number().int().min(0).max(1000).optional(),
  takeProfit: z.string().optional(),
  stopLoss: z.string().optional(),
  triggerBy: z.enum(["MarkPrice", "LastPrice"]).optional(),
  reduceOnly: z.boolean().optional(),
  timeInForce: z.enum(["GTC", "IOC", "FOK"]).optional(),
});

// ── Idempotency cache ──

interface CacheEntry {
  result: ExecutionResult;
  expiresAt: number;
}

const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutes
const idempotencyCache = new Map<string, CacheEntry>();

// Cleanup expired entries every 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of idempotencyCache) {
    if (now > entry.expiresAt) {
      idempotencyCache.delete(key);
    }
  }
}, 60_000);

// ── Main execution function ──

export async function executeOrder(
  rawIntent: unknown,
  idempotencyKey?: string
): Promise<ExecutionResult> {
  // 1. Validate intent
  const parsed = OrderIntentSchema.safeParse(rawIntent);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return makeErrorResult(rawIntent, "INVALID_PARAMS", `Validation failed: ${issues}`);
  }

  const intent: OrderIntent = parsed.data;

  // Limit orders must have price
  if (intent.type === "limit" && !intent.price) {
    return makeErrorResult(intent, "INVALID_PARAMS", "Limit orders require a price");
  }

  // 2. Check idempotency cache
  if (idempotencyKey) {
    const cached = idempotencyCache.get(idempotencyKey);
    if (cached && Date.now() < cached.expiresAt) {
      return { ...cached.result, cached: true };
    }
  }

  // 3. Map intent → Pacifica params
  let orderParams;
  try {
    orderParams = mapOrderIntent(intent);
  } catch (err: unknown) {
    return makeErrorResult(
      intent,
      "INVALID_PARAMS",
      err instanceof Error ? err.message : "Failed to map order intent"
    );
  }

  // 4-5. Execute (testnet simulation or live)
  let result: ExecutionResult;

  if (config.executionMode === "testnet") {
    result = simulateOrder(intent, { ...orderParams });
  } else {
    result = await sendToExchange(intent, { ...orderParams });
  }

  // 6. Cache result for idempotency
  if (idempotencyKey) {
    idempotencyCache.set(idempotencyKey, {
      result,
      expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
    });
  }

  return result;
}

// ── Testnet simulation ──

function simulateOrder(
  intent: OrderIntent,
  _params: Record<string, unknown>
): ExecutionResult {
  return {
    success: true,
    orderId: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "simulated",
    symbol: intent.symbol,
    side: intent.side,
    orderType: intent.type,
    executedQuantity: intent.quantity,
    timestamp: Date.now(),
    simulated: true,
  };
}

// ── Live execution with retry ──

async function sendToExchange(
  intent: OrderIntent,
  orderParams: Record<string, unknown>
): Promise<ExecutionResult> {
  const maxAttempts = config.maxRetries;
  let lastError: ExecutionError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { status, data } = await sendSignedRequest({
        method: "POST",
        path: "/order",
        instruction: "orderExecute",
        body: orderParams as Record<string, unknown>,
      });

      // Success
      if (status >= 200 && status < 300) {
        const resp = data as Record<string, unknown>;
        return {
          success: true,
          orderId: String(resp.id ?? ""),
          clientId: resp.clientId ? String(resp.clientId) : undefined,
          status: mapOrderStatus(String(resp.status ?? "open")),
          executedQuantity: resp.executedQuantity
            ? String(resp.executedQuantity)
            : undefined,
          executedQuoteQuantity: resp.executedQuoteQuantity
            ? String(resp.executedQuoteQuantity)
            : undefined,
          symbol: intent.symbol,
          side: intent.side,
          orderType: intent.type,
          timestamp: Date.now(),
        };
      }

      // Client error — don't retry
      if (status >= 400 && status < 500) {
        return makeErrorResult(
          intent,
          status === 429 ? "RATE_LIMITED" : "EXCHANGE_REJECTED",
          `Exchange returned ${status}: ${JSON.stringify(data)}`,
          data
        );
      }

      // Server error — retry
      lastError = {
        code: "EXCHANGE_REJECTED",
        message: `Exchange returned ${status}`,
        details: data,
      };
    } catch (err: unknown) {
      const execErr = err as ExecutionError;
      lastError = execErr;

      // Timeout and network errors are retryable
      if (execErr.code !== "TIMEOUT" && execErr.code !== "NETWORK_ERROR") {
        break;
      }
    }

    // Exponential backoff before retry
    if (attempt < maxAttempts) {
      const delay = config.retryBaseDelayMs * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }

  // All retries exhausted
  return makeErrorResult(
    intent,
    lastError?.code ?? "UNKNOWN",
    lastError?.message ?? "Order execution failed after all retries",
    lastError?.details
  );
}

// ── Helpers ──

function mapOrderStatus(
  status: string
): ExecutionResult["status"] {
  const s = status.toLowerCase();
  if (s === "filled") return "filled";
  if (s === "partially_filled" || s === "partiallyfilled") return "partially_filled";
  if (s === "cancelled" || s === "expired" || s === "rejected") return "rejected";
  return "open";
}

function makeErrorResult(
  intentOrRaw: unknown,
  code: ExecutionErrorCode,
  message: string,
  details?: unknown
): ExecutionResult {
  const intent = intentOrRaw as Partial<OrderIntent> | undefined;
  return {
    success: false,
    status: "rejected",
    symbol: intent?.symbol ?? "UNKNOWN",
    side: intent?.side ?? "buy",
    orderType: intent?.type ?? "market",
    timestamp: Date.now(),
    error: { code, message, details },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
