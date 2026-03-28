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

// ── Execution Types ──

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit";

export const EXECUTION_ERROR_CODES = [
  "INVALID_PARAMS",
  "SIGNING_FAILED",
  "TIMEOUT",
  "RATE_LIMITED",
  "EXCHANGE_REJECTED",
  "DUPLICATE_ORDER",
  "NETWORK_ERROR",
  "UNKNOWN",
] as const;

export type ExecutionErrorCode = (typeof EXECUTION_ERROR_CODES)[number];

export interface OrderIntent {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: string;
  /** Required for limit orders */
  price?: string;
  /** Slippage in basis points (overrides default) */
  slippageBps?: number;
  /** Take-profit price */
  takeProfit?: string;
  /** Stop-loss price */
  stopLoss?: string;
  /** TP/SL trigger reference */
  triggerBy?: "MarkPrice" | "LastPrice";
  /** Reduce-only flag for futures */
  reduceOnly?: boolean;
  /** Time-in-force for limit orders */
  timeInForce?: "GTC" | "IOC" | "FOK";
}

export interface ExecutionError {
  code: ExecutionErrorCode;
  message: string;
  details?: unknown;
}

export interface ExecutionResult {
  success: boolean;
  orderId?: string;
  clientId?: string;
  status: "filled" | "partially_filled" | "open" | "rejected" | "simulated";
  executedQuantity?: string;
  executedQuoteQuantity?: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  timestamp: number;
  error?: ExecutionError;
  /** True if this result was returned from the idempotency cache */
  cached?: boolean;
  /** True if this was a testnet simulation */
  simulated?: boolean;
}
