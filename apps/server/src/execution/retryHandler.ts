import { config } from "../config.js";

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError?: Error
  ) {
    super(message);
    this.name = "RetryError";
  }
}

/**
 * Executes a function with exponential backoff retry logic.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  const {
    maxRetries = config?.maxRetries ?? 3,
    baseDelayMs = config?.retryBaseDelayMs ?? 500,
    maxDelayMs = 30_000,
    timeoutMs = config?.requestTimeoutMs ?? 10000,
  } = retryConfig ?? {};

  let lastError: Error | undefined;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      // Apply timeout to the operation
      const result = await withTimeout(fn, timeoutMs);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      attempt++;

      if (attempt > maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff + jitter
      const delay = calculateBackoff(attempt, baseDelayMs, maxDelayMs);
      console.warn(`[Retry] Attempt ${attempt}/${maxRetries} failed. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw new RetryError(
    `Operation failed after ${attempt} attempts`,
    attempt,
    lastError
  );
}

/**
 * Wraps a promise with a timeout.
 */
async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Calculate exponential backoff delay with jitter.
 */
function calculateBackoff(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  // Exponential backoff: baseDelay * 2^(attempt-1)
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);

  // Add jitter (±25% randomness)
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);

  // Cap at maxDelayMs
  return Math.min(exponentialDelay + jitter, maxDelayMs);
}

/**
 * Sleep for a specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
