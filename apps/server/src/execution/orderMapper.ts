/**
 * Maps Argus OrderIntent → Pacifica API order parameters.
 *
 * Handles:
 * - Side mapping: buy → Bid, sell → Ask
 * - Symbol mapping: SOL → SOL_USDC_PERP
 * - Market vs limit order construction
 * - TP/SL injection with config defaults
 * - Slippage tolerance for market orders
 */

import type { OrderIntent } from "@argus/shared";
import { config } from "../config.js";

/** Pacifica order body for the execute order API */
export interface PacificaOrderParams {
  symbol: string;
  side: "Bid" | "Ask";
  orderType: "Market" | "Limit";
  quantity: string;
  price?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";
  reduceOnly?: boolean;
  selfTradePrevention?: "RejectTaker";
  slippageTolerance?: string;
  takeProfitTriggerPrice?: string;
  takeProfitTriggerBy?: "MarkPrice" | "LastPrice";
  stopLossTriggerPrice?: string;
  stopLossTriggerBy?: "MarkPrice" | "LastPrice";
}

/**
 * Map a symbol shorthand to the Pacifica perp contract symbol.
 * e.g. "SOL" → "SOL_USDC_PERP", "BTC" → "BTC_USDC_PERP"
 */
function mapSymbol(symbol: string): string {
  // If already in full format, pass through
  if (symbol.includes("_")) return symbol;
  return `${symbol.toUpperCase()}_USDC_PERP`;
}

/**
 * Map Argus side to Pacifica side.
 */
function mapSide(side: "buy" | "sell"): "Bid" | "Ask" {
  return side === "buy" ? "Bid" : "Ask";
}

/**
 * Convert basis points to a decimal string for slippage tolerance.
 * e.g. 50 bps → "0.005"
 */
function bpsToDecimal(bps: number): string {
  return (bps / 10000).toFixed(6);
}

/**
 * Map an OrderIntent to Pacifica API order parameters.
 */
export function mapOrderIntent(intent: OrderIntent): PacificaOrderParams {
  const params: PacificaOrderParams = {
    symbol: mapSymbol(intent.symbol),
    side: mapSide(intent.side),
    orderType: intent.type === "market" ? "Market" : "Limit",
    quantity: intent.quantity,
    selfTradePrevention: "RejectTaker",
  };

  // Limit order specifics
  if (intent.type === "limit") {
    if (!intent.price) {
      throw new Error("Limit orders require a price");
    }
    params.price = intent.price;
    params.timeInForce = intent.timeInForce ?? "GTC";
  }

  // Market order slippage
  if (intent.type === "market") {
    const slippageBps = intent.slippageBps ?? config.defaultSlippageBps;
    params.slippageTolerance = bpsToDecimal(slippageBps);
  }

  // Reduce-only
  if (intent.reduceOnly) {
    params.reduceOnly = true;
  }

  // Take-profit
  const triggerBy = intent.triggerBy ?? "MarkPrice";
  if (intent.takeProfit) {
    params.takeProfitTriggerPrice = intent.takeProfit;
    params.takeProfitTriggerBy = triggerBy;
  }

  // Stop-loss
  if (intent.stopLoss) {
    params.stopLossTriggerPrice = intent.stopLoss;
    params.stopLossTriggerBy = triggerBy;
  }

  return params;
}

/**
 * Flatten PacificaOrderParams into a flat string-keyed record for signing.
 * Removes undefined values.
 */
export function flattenForSigning(
  params: PacificaOrderParams
): Record<string, string | number | boolean> {
  const flat: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) {
      flat[k] = typeof v === "boolean" ? v : String(v);
    }
  }
  return flat;
}
