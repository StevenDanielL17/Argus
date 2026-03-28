import { config } from "../config.js";
import { BuiltOrder } from "./orderBuilder.js";
import { signRequest } from "./signer.js";
import { withRetry, RetryError } from "./retryHandler.js";

export interface OrderResponse {
  success: boolean;
  orderId?: string;
  error?: string;
  idempotencyKey?: string;
}

// Lazy-loaded API key (computed once on first use)
let _apiKeyCache: string | null = null;
async function getApiKeyLazy(): Promise<string> {
  if (!_apiKeyCache && config.pacificaPrivateKey && config.pacificaPrivateKey.length > 0) {
    const { getApiKey } = await import("./signer.js");
    _apiKeyCache = await getApiKey();
  }
  return _apiKeyCache ?? "";
}

/**
 * Pacifica API client for order execution.
 * Handles signing, submission, and response parsing.
 */
export class PacificaClient {
  private restUrl: string;
  private isDemoMode: boolean;

  constructor() {
    this.restUrl = config.pacificaRestUrl;
    this.isDemoMode = !config.pacificaPrivateKey || config.pacificaPrivateKey.length === 0;
  }

  async executeOrder(order: BuiltOrder, idempotencyKey?: string): Promise<OrderResponse> {
    const timestamp = Date.now();
    const window = config.requestWindowMs;

    // Demo mode: return mock success response
    if (this.isDemoMode) {
      console.log(`[Demo Mode] Would execute order: ${order.side} ${order.quantity} ${order.symbol}`);
      return {
        success: true,
        orderId: `demo-${Date.now()}`,
        idempotencyKey: idempotencyKey ?? "demo-key",
      };
    }

    // Get API key (lazy-loaded)
    const apiKey = await getApiKeyLazy();

    // Generate idempotency key if not provided
    const key = idempotencyKey ?? IdempotencyManager.generateKey({
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      type: order.type,
      price: order.price ?? "",
      timestamp,
    });

    // Build the order payload
    const payload = {
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      quantity: order.quantity,
      price: order.price ?? "",
      builder_code: order.builder_code,
    };

    try {
      // Execute with retry logic
      const result = await withRetry(async () => {
        // Sign the request
        const signature = await signRequest("place_order", payload, timestamp, window);

        // Submit to Pacifica API
        const response = await fetch(`${this.restUrl}/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
            "X-Timestamp": timestamp.toString(),
            "X-Window": window.toString(),
            "X-Signature": signature,
            "X-Idempotency-Key": key,
          },
          body: JSON.stringify({
            ...payload,
            slippage_bps: order.slippage_bps,
            take_profit: order.tp,
            stop_loss: order.sl,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Pacifica API error: ${error}`);
        }

        return await response.json();
      });

      return { success: true, orderId: result.orderId, idempotencyKey: key };
    } catch (error) {
      if (error instanceof RetryError) {
        return {
          success: false,
          error: `Execution failed after ${error.attempts} attempts: ${error.lastError?.message}`,
          idempotencyKey: key,
        };
      }
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: `Execution failed: ${message}`, idempotencyKey: key };
    }
  }
}

// Import IdempotencyManager for key generation
import { IdempotencyManager } from "./idempotencyManager.js";
