import { config } from "../config.js";

export interface OrderIntent {
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  quantity: string;
  price?: string;
  tp?: string;
  sl?: string;
}

export interface BuiltOrder extends OrderIntent {
  builder_code: string;
  timestamp: number;
  slippage_bps: number;
}

/**
 * Builds order payloads with builder code injected.
 * Every order executed through Argus includes the builder code.
 */
export class OrderBuilder {
  private builderCode: string;
  private defaultSlippageBps: number;

  constructor() {
    this.builderCode = config.builderCode;
    this.defaultSlippageBps = config.defaultSlippageBps;
  }

  build(intent: OrderIntent): BuiltOrder {
    const order: BuiltOrder = {
      ...intent,
      builder_code: this.builderCode,
      timestamp: Date.now(),
      slippage_bps: this.defaultSlippageBps,
    };

    // Add TP/SL if configured
    if (config.defaultTpPct > 0 && !order.tp) {
      order.tp = this.calculateTp(order.side, order.price, config.defaultTpPct);
    }
    if (config.defaultSlPct > 0 && !order.sl) {
      order.sl = this.calculateSl(order.side, order.price, config.defaultSlPct);
    }

    return order;
  }

  private calculateTp(side: "BUY" | "SELL", entryPrice: string | undefined, tpPct: number): string {
    if (!entryPrice) return "";
    const price = parseFloat(entryPrice);
    const tpPrice = side === "BUY" ? price * (1 + tpPct / 100) : price * (1 - tpPct / 100);
    return tpPrice.toFixed(2);
  }

  private calculateSl(side: "BUY" | "SELL", entryPrice: string | undefined, slPct: number): string {
    if (!entryPrice) return "";
    const price = parseFloat(entryPrice);
    const slPrice = side === "BUY" ? price * (1 - slPct / 100) : price * (1 + slPct / 100);
    return slPrice.toFixed(2);
  }
}
