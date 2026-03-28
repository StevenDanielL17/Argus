import dotenv from "dotenv";

dotenv.config();

const env = process.env.NODE_ENV ?? "development";

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  env,
  port: Number(process.env.PORT ?? 8080),
  corsOrigin: process.env.CORS_ORIGIN ?? (env === "development" ? true : ["https://argus.pacifica.tools"]),
  pacificaApiKey: process.env.PACIFICA_API_KEY ?? "",
  pacificaPrivateKey: process.env.PACIFICA_PRIVATE_KEY ?? "",
  builderCode: process.env.BUILDER_CODE ?? (env === "development" ? "ARGUS_BUILDER_001" : required("BUILDER_CODE")),
  pacificaWsUrl:
    process.env.PACIFICA_WS_URL ??
    (env === "development" ? "wss://ws.pacifica.fi/ws" : required("PACIFICA_WS_URL")),
  pacificaRestUrl:
    process.env.PACIFICA_REST_URL ??
    (env === "development" ? "https://api.pacifica.fi/api/v1" : required("PACIFICA_REST_URL")),
  symbols: (process.env.PACIFICA_SYMBOLS ?? "SOL,BTC").split(","),
  depthWindowPct: Number(process.env.DEPTH_WINDOW_PCT ?? 0.02),
  updateIntervalMs: Number(process.env.UPDATE_INTERVAL_MS ?? 1000),
  // Signal thresholds
  whaleThreshold: Number(process.env.WHALE_THRESHOLD ?? 50000),
  fundingAnomalyThreshold: Number(process.env.FUNDING_ANOMALY_THRESHOLD ?? 0.0005),
  imbalanceRatioThreshold: Number(process.env.IMBALANCE_RATIO_THRESHOLD ?? 3),
  whaleCooldownMs: Number(process.env.WHALE_COOLDOWN_MS ?? 15000),

  // Execution layer
  executionMode: (process.env.EXECUTION_MODE ?? "testnet") as "live" | "testnet",
  defaultSlippageBps: Number(process.env.DEFAULT_SLIPPAGE_BPS ?? 50),
  defaultTpPct: Number(process.env.DEFAULT_TP_PCT ?? 5),
  defaultSlPct: Number(process.env.DEFAULT_SL_PCT ?? 3),
  maxRetries: Number(process.env.MAX_RETRIES ?? 3),
  retryBaseDelayMs: Number(process.env.RETRY_BASE_DELAY_MS ?? 500),
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 10000),
  requestWindowMs: Number(process.env.REQUEST_WINDOW_MS ?? 5000),

  // Rate limiting
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000),
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 10),
};
