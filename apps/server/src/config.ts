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
  updateIntervalMs: Number(process.env.UPDATE_INTERVAL_MS ?? 1000)
};
