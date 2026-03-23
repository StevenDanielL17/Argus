export type Side = "buy" | "sell";

export interface MarketTick {
  symbol: string;
  timestamp: number;
  fundingRate: number;
  openInterest: number;
  bidDepth2pct: number;
  askDepth2pct: number;
}

export interface SignalState {
  score: number;
  band: "green" | "yellow" | "orange" | "red";
  reason: string;
  updatedAt: number;
}
