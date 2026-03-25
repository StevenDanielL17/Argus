import type { SignalEvent } from "@argus/shared";
import { emitSignal } from "./signalBus.js";
import { config } from "../config.js";

let lastAlertTime: Record<string, number> = {};
const COOLDOWN_MS = 30_000; // 30s between alerts per symbol

export function detectImbalance(
  bidDepth: number,
  askDepth: number,
  symbol: string
): SignalEvent | null {
  const threshold = config.imbalanceRatioThreshold;

  if (bidDepth <= 0 || askDepth <= 0) return null;

  const ratio = bidDepth / askDepth;
  const isImbalanced = ratio > threshold || ratio < 1 / threshold;

  if (!isImbalanced) return null;

  // Cooldown check
  const now = Date.now();
  const lastAlert = lastAlertTime[symbol] ?? 0;
  if (now - lastAlert < COOLDOWN_MS) return null;
  lastAlertTime[symbol] = now;

  const direction = ratio > threshold ? "BID-heavy" : "ASK-heavy";
  const ratioStr = ratio > 1 ? ratio.toFixed(1) : (1 / ratio).toFixed(1);
  const severity = ratio > threshold * 1.5 || ratio < 1 / (threshold * 1.5) ? "critical" : "medium";

  const event: SignalEvent = {
    id: `imbalance-${symbol}-${now}`,
    type: "orderbook_imbalance",
    severity,
    symbol,
    message: `📊 Orderbook imbalance: ${ratioStr}:1 ${direction}`,
    value: ratio,
    timestamp: now,
  };

  emitSignal(event);
  return event;
}
