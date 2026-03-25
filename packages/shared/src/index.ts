export type SignalBand = "green" | "yellow" | "orange" | "red";

export interface LiquidationSignal {
  score: number;
  band: SignalBand;
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
