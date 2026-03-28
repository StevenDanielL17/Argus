import { broadcast } from "./ws/clientHub.js";
import { computeLiquidationRiskScore } from "./signals/liquidationScore.js";
import { detectWhale } from "./signals/whaleDetector.js";
import { detectFundingAnomaly } from "./signals/fundingAnomaly.js";
import { detectImbalance } from "./signals/orderbookImbalance.js";
import type { MarketTick } from "./types.js";

interface Trade {
  symbol: string;
  timestamp: number;
  price: number;
  amount: number;
  value: number;
  side: "BUY" | "SELL";
  isWhale: boolean;
}

let lastMidPrice = 94230; // BTC starting price
let lastFundingRate = 0.0001;
let lastAlertTime = 0;

export function startDemoFeed() {
  let openInterest = 1_500_000;
  let baselineDepth = 120_000;

  // Market tick interval (1s)
  const tickInterval = setInterval(() => {
    const now = Date.now();
    openInterest = Math.max(900_000, openInterest + (Math.random() - 0.5) * 35_000);
    baselineDepth = Math.max(80_000, baselineDepth + (Math.random() - 0.5) * 4_000);

    const tick: MarketTick = {
      symbol: "BTC-PERP",
      timestamp: now,
      fundingRate: lastFundingRate + (Math.random() - 0.5) * 0.0001,
      openInterest,
      bidDepth2pct: 40_000 + Math.random() * 30_000,
      askDepth2pct: 35_000 + Math.random() * 30_000
    };
    lastFundingRate = tick.fundingRate;

    const signal = computeLiquidationRiskScore(tick, openInterest * 0.97, baselineDepth);
    broadcast({ type: "market_tick", tick, signal });

    // Send orderbook data
    const bids = [];
    const asks = [];
    let currentBid = lastMidPrice;
    let currentAsk = lastMidPrice + 5;
    for (let i = 0; i < 20; i++) {
      bids.push({ price: currentBid, size: (Math.random() * 10 + 1).toFixed(4) });
      asks.push({ price: currentAsk, size: (Math.random() * 10 + 1).toFixed(4) });
      currentBid -= Math.random() * 2 + 0.5;
      currentAsk += Math.random() * 2 + 0.5;
    }
    broadcast({ type: "orderbook", bids, asks });

    // Update mid price
    lastMidPrice = (lastMidPrice + (Math.random() - 0.5) * 50);
  }, 1000);

  // Trade feed interval (2-5s)
  const tradeInterval = setInterval(() => {
    const price = lastMidPrice + (Math.random() - 0.5) * 20;
    const amount = Math.random() * (Math.random() > 0.85 ? 50 : 5); // 15% chance of whale
    const value = price * amount;
    const side = Math.random() > 0.5 ? "BUY" : "SELL";
    const isWhale = value > 50000;

    const trade: Trade = {
      symbol: "BTC-PERP",
      timestamp: Date.now(),
      price: Math.round(price * 100) / 100,
      amount: Math.round(amount * 100) / 100,
      value: Math.round(value * 100) / 100,
      side: side as "BUY" | "SELL",
      isWhale,
    };

    broadcast({ type: "trade", trade });

    if (isWhale) {
      detectWhale(trade);
    }
  }, 2000 + Math.random() * 3000);

  // Signal alerts interval (10-20s)
  const alertInterval = setInterval(() => {
    const now = Date.now();
    if (now - lastAlertTime > 10000) {
      const alertTypes = [
        { type: "funding_anomaly", message: "Funding rate spike detected", severity: "medium" },
        { type: "whale_alert", message: "Large trade detected", severity: "high" },
        { type: "imbalance", message: "Orderbook imbalance", severity: "low" },
        { type: "lrs_spike", message: "Liquidation risk increasing", severity: "critical" },
      ];
      const alert = alertTypes[Math.floor(Math.random() * alertTypes.length)];

      broadcast({
        type: "alert",
        alert: {
          ...alert,
          timestamp: now,
        },
      });
      lastAlertTime = now;
    }
  }, 10000 + Math.random() * 10000);

  // Return cleanup function
  return () => {
    clearInterval(tickInterval);
    clearInterval(tradeInterval);
    clearInterval(alertInterval);
  };
}
