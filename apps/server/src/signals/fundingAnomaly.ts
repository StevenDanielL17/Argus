import type { SignalEvent } from "@argus/shared";
import { emitSignal } from "./signalBus.js";
import { config } from "../config.js";

let lastAlertTime: Record<string, number> = {};
const COOLDOWN_MS = 60_000; // 60s between alerts per symbol

export function detectFundingAnomaly(
  fundingRate: number,
  symbol: string
): SignalEvent | null {
  const threshold = config.fundingAnomalyThreshold;

  if (Math.abs(fundingRate) <= threshold) return null;

  // Cooldown check
  const now = Date.now();
  const lastAlert = lastAlertTime[symbol] ?? 0;
  if (now - lastAlert < COOLDOWN_MS) return null;
  lastAlertTime[symbol] = now;

  const direction = fundingRate > 0 ? "long-biased" : "short-biased";
  const pct = (fundingRate * 100).toFixed(4);
  const severity = Math.abs(fundingRate) > threshold * 2 ? "critical" : "high";

  const event: SignalEvent = {
    id: `funding-${symbol}-${now}`,
    type: "funding_anomaly",
    severity,
    symbol,
    message: `⚠ Funding rate anomaly: ${pct}% (${direction})`,
    value: fundingRate,
    timestamp: now,
  };

  emitSignal(event);
  return event;
}
