import { PacificaConnectionManager } from "./pacificaConnectionManager.js";
import { OrderbookMessageSchema, type MarketTick, type OrderbookMessage } from "@argus/shared";
import { broadcast } from "./clientHub.js";
import { computeLiquidationRiskScore } from "../signals/liquidationScore.js";

interface TradeMessage {
  channel: "trade";
  data: {
    s: string; // symbol
    t: number; // timestamp
    p: string; // price
    a: string; // amount
    side: "bid" | "ask";
  };
}

let simulatedOpenInterest = 1_500_000;
let baselineDepth = 120_000;

export interface PacificaFeedOptions {
  symbols: string[];
  depthWindowPct: number;
  updateIntervalMs: number;
}

export function startPacificaFeeds(url: string, options: PacificaFeedOptions) {
  const manager = new PacificaConnectionManager(url, options.symbols);

  let lastMessageTime = Date.now();
  let lastBroadcastTime = 0;
  
  manager.onMessage((data) => {
    lastMessageTime = Date.now();
    try {
      const parsed = JSON.parse(data.toString());
      if (parsed.channel === "book") {
        const result = OrderbookMessageSchema.safeParse(parsed);
        if (result.success) {
          const now = Date.now();
          if (now - lastBroadcastTime >= options.updateIntervalMs) {
            processOrderbookMessage(result.data, options.depthWindowPct);
            lastBroadcastTime = now;
          }
        } else {
          console.warn("[PacificaFeeds] Invalid orderbook message format:", result.error.message);
        }
      } else if (parsed.channel === "trade") {
        processTrade(parsed as TradeMessage);
      }
    } catch (e) {
      console.error("[PacificaFeeds] Failed to parse message:", e);
    }
  });

  const staleCheckInterval = setInterval(() => {
    if (Date.now() - lastMessageTime > 3000) {
      console.warn("[PacificaFeeds] Stale feed detected (>3s without message). Resyncing...");
      manager.disconnect();
      manager.connect();
      lastMessageTime = Date.now(); // reset to avoid immediate loop
    }
  }, 1000);

  manager.connect();

  return () => {
    clearInterval(staleCheckInterval);
    manager.disconnect();
  };
}

function processOrderbookMessage(msg: OrderbookMessage, depthWindowPct: number) {
  const { l, s, t } = msg.data;
  const bids = l[0];
  const asks = l[1];

  if (bids.length === 0 || asks.length === 0) return;

  const highestBid = parseFloat(bids[0].p);
  const lowestAsk = parseFloat(asks[0].p);
  const midPrice = (highestBid + lowestAsk) / 2;

  const formattedBids = bids.map(b => ({ price: parseFloat(b.p), size: parseFloat(b.a) }));
  const formattedAsks = asks.map(a => ({ price: parseFloat(a.p), size: parseFloat(a.a) }));

  broadcast({
    type: "orderbook",
    bids: formattedBids,
    asks: formattedAsks
  });

  const lowerBound = midPrice * (1 - depthWindowPct);
  const upperBound = midPrice * (1 + depthWindowPct);

  let bidDepth2pct = 0;
  for (const bid of bids) {
    const price = parseFloat(bid.p);
    if (price >= lowerBound) {
      bidDepth2pct += parseFloat(bid.a);
    }
  }

  let askDepth2pct = 0;
  for (const ask of asks) {
    const price = parseFloat(ask.p);
    if (price <= upperBound) {
      askDepth2pct += parseFloat(ask.a);
    }
  }

  // Simulate evolving OI and Baseline
  simulatedOpenInterest = Math.max(900_000, simulatedOpenInterest + (Math.random() - 0.5) * 5_000);
  baselineDepth = Math.max(80_000, baselineDepth + (Math.random() - 0.5) * 1_000);

  const tick: MarketTick = {
    symbol: s,
    timestamp: t,
    fundingRate: (Math.random() - 0.25) * 0.012, // mock funding rate
    openInterest: simulatedOpenInterest,
    bidDepth2pct,
    askDepth2pct,
  };

  const signal = computeLiquidationRiskScore(tick, simulatedOpenInterest * 0.97, baselineDepth);
  broadcast({ type: "market_tick", tick, signal });
}

function processTrade(msg: TradeMessage) {
  const { p, a, s, side, t } = msg.data;
  const price = parseFloat(p);
  const amount = parseFloat(a);
  const value = price * amount;
  const isWhale = value > 50000; // $50K threshold

  broadcast({
    type: "trade",
    trade: {
      symbol: s,
      timestamp: t,
      price,
      amount,
      value,
      side: side === "bid" ? "BUY" : "SELL",
      isWhale,
    },
  });
}
