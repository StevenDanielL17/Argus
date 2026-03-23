import { broadcast } from "./ws/clientHub.js";
import { computeLiquidationRiskScore } from "./signals/liquidationScore.js";
import type { MarketTick } from "./types.js";

export function startDevMockFeed(): NodeJS.Timeout {
  let openInterest = 1_500_000;
  let baselineDepth = 120_000;

  return setInterval(() => {
    const now = Date.now();
    openInterest = Math.max(900_000, openInterest + (Math.random() - 0.5) * 35_000);
    baselineDepth = Math.max(80_000, baselineDepth + (Math.random() - 0.5) * 4_000);

    const tick: MarketTick = {
      symbol: "BTC-PERP",
      timestamp: now,
      fundingRate: (Math.random() - 0.25) * 0.012,
      openInterest,
      bidDepth2pct: 40_000 + Math.random() * 30_000,
      askDepth2pct: 35_000 + Math.random() * 30_000
    };

    const signal = computeLiquidationRiskScore(tick, openInterest * 0.97, baselineDepth);
    broadcast({ type: "market_tick", tick, signal });
  }, 1000);
}
