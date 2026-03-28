import { createHash } from "node:crypto";

interface IdempotencyRecord {
  response: unknown;
  createdAt: number;
  status: number;
}

/**
 * Manages idempotency keys to prevent duplicate order execution.
 * Keys are stored in-memory with TTL-based expiration.
 */
export class IdempotencyManager {
  private store = new Map<string, IdempotencyRecord>();
  private ttlMs: number;

  constructor(ttlMs: number = 300_000) { // 5 minutes default
    this.ttlMs = ttlMs;

    // Cleanup expired keys every minute
    setInterval(() => this.cleanup(), 60_000);
  }

  /**
   * Generate an idempotency key from request parameters.
   */
  static generateKey(params: {
    symbol: string;
    side: string;
    quantity: string;
    type: string;
    price?: string;
    timestamp: number;
  }): string {
    const payload = `${params.symbol}|${params.side}|${params.quantity}|${params.type}|${params.price ?? ""}|${params.timestamp}`;
    return createHash("sha256").update(payload).digest("hex");
  }

  /**
   * Check if a request with this idempotency key has already been processed.
   * Returns the cached response if found, null otherwise.
   */
  get(idempotencyKey: string): IdempotencyRecord | null {
    const record = this.store.get(idempotencyKey);
    if (!record) return null;

    // Check if expired
    if (Date.now() - record.createdAt > this.ttlMs) {
      this.store.delete(idempotencyKey);
      return null;
    }

    return record;
  }

  /**
   * Store a response for an idempotency key.
   */
  set(idempotencyKey: string, response: unknown, status: number): void {
    this.store.set(idempotencyKey, {
      response,
      createdAt: Date.now(),
      status,
    });
  }

  /**
   * Clean up expired keys.
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now - record.createdAt > this.ttlMs) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all stored keys (useful for testing).
   */
  clear(): void {
    this.store.clear();
  }
}
