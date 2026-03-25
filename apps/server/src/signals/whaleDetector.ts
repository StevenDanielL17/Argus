import type { SignalEvent } from "@argus/shared";
import { emitSignal } from "./signalBus.js";
import { config } from "../config.js";

export interface TradeInput {
  symbol: string;
  timestamp: number;
  price: number;
  amount: number;
  value: number;
  side: "BUY" | "SELL";
}

const seenTrades = new Set<string>();
let lastWhaleAlertTime: Record<string, number> = {};

export function detectWhale(trade: TradeInput): SignalEvent | null {
  const threshold = config.whaleThreshold;
  const cooldownMs = config.whaleCooldownMs;

  // Deduplication: prevent duplicate alerts for same trade
  const tradeId = `${trade.symbol}-${trade.timestamp}-${trade.price}`;
  if (seenTrades.has(tradeId)) return null;
  seenTrades.add(tradeId);

  // Cleanup old trade IDs (keep last 200)
  if (seenTrades.size > 200) {
    const iter = seenTrades.values();
    for (let i = 0; i < 100; i++) {
      const v = iter.next().value;
      if (v) seenTrades.delete(v);
    }
  }

  if (trade.value < threshold) return null;

  // Cooldown: don't spam whale alerts for same symbol
  const now = Date.now();
  const lastAlert = lastWhaleAlertTime[trade.symbol] ?? 0;
  if (now - lastAlert < cooldownMs) return null;
  lastWhaleAlertTime[trade.symbol] = now;

  const severity = trade.value > 100_000 ? "critical" : "high";
  const event: SignalEvent = {
    id: `whale-${tradeId}`,
    type: "whale",
    severity,
    symbol: trade.symbol,
    message: `🐋 Whale ${trade.side}: $${trade.value.toLocaleString()} @ ${trade.price.toLocaleString()}`,
    value: trade.value,
    timestamp: trade.timestamp,
  };

  emitSignal(event);
  return event;
}
