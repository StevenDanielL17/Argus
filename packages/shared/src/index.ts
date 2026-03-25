export type SignalBand = "green" | "yellow" | "orange" | "red";
export type SignalSeverity = "low" | "medium" | "high" | "critical";
export type SignalType = "whale" | "funding_anomaly" | "orderbook_imbalance" | "liquidation_risk";

export interface SignalEvent {
  id: string;
  type: SignalType;
  severity: SignalSeverity;
  symbol: string;
  message: string;
  value?: number;
  timestamp: number;
}

export interface LiquidationSignal {
  score: number;
  band: SignalBand;
  severity: SignalSeverity;
  reason: string;
  updatedAt: number;
}

export type MarketTick = {
  symbol: string;
  timestamp: number;
  fundingRate: number;
  openInterest: number;
  bidDepth2pct: number;
  askDepth2pct: number;
};
export * from "./schemas.js";
