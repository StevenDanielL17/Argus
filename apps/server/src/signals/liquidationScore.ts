import type { MarketTick, SignalState } from "../types.js";

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function band(score: number): SignalState["band"] {
  if (score >= 80) return "red";
  if (score >= 60) return "orange";
  if (score >= 30) return "yellow";
  return "green";
}

function severity(score: number): SignalState["severity"] {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

export function computeLiquidationRiskScore(
  tick: MarketTick,
  oi5mAgo: number,
  baselineDepth: number
): SignalState {
  const frp = clamp((Math.abs(tick.fundingRate) / 0.01) * 100);
  const oiVelocity = oi5mAgo > 0 ? Math.abs((tick.openInterest - oi5mAgo) / oi5mAgo) * 1000 : 0;
  const oiv = clamp(oiVelocity);
  const depthNow = tick.bidDepth2pct + tick.askDepth2pct;
  const ots = baselineDepth > 0 ? clamp(100 - (depthNow / baselineDepth) * 100) : 0;

  const score = frp * 0.4 + oiv * 0.35 + ots * 0.25;
  const roundedScore = Math.round(score * 100) / 100;

  return {
    score: roundedScore,
    band: band(roundedScore),
    severity: severity(roundedScore),
    reason: `FRP=${frp.toFixed(1)} OIV=${oiv.toFixed(1)} OTS=${ots.toFixed(1)}`,
    updatedAt: tick.timestamp
  };
}
