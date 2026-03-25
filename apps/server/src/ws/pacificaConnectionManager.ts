import WebSocket from "ws";
import { config } from "../config.js";

type SubscriptionCallback = (data: Buffer | string) => void;

export class PacificaConnectionManager {
  private ws: WebSocket | null = null;
  private url: string;
  private symbols: string[];
  private callbacks: SubscriptionCallback[] = [];
  
  private reconnectInterval = 500;
  private maxReconnectInterval = 3000;
  private isIntentionalClose = false;

  constructor(url: string, symbols: string[]) {
    this.url = url;
    this.symbols = symbols;
  }

  public connect() {
    this.isIntentionalClose = false;
    this.ws = new WebSocket(this.url);

    this.ws.on("open", () => {
      console.log(`[PacificaConnectionManager] Connected to ${this.url}`);
      this.reconnectInterval = 500; // Reset
      this.subscribe();
      this.subscribeTrades();
    });

    this.ws.on("message", (data: WebSocket.RawData) => {
      // Notify all registered callbacks
      for (const cb of this.callbacks) {
        cb(data as Buffer | string);
      }
    });

    this.ws.on("close", () => {
      if (!this.isIntentionalClose) {
        console.warn(`[PacificaConnectionManager] Disconnected. Reconnecting in ${this.reconnectInterval}ms...`);
        setTimeout(() => this.connect(), this.reconnectInterval);
        this.reconnectInterval = Math.min(this.maxReconnectInterval, this.reconnectInterval * 1.5);
      }
    });

    this.ws.on("error", (err: Error) => {
      console.error(`[PacificaConnectionManager] Error:`, err);
    });
  }

  public disconnect() {
    this.isIntentionalClose = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public onMessage(cb: SubscriptionCallback) {
    this.callbacks.push(cb);
  }

  private subscribe() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    for (const symbol of this.symbols) {
      this.ws.send(JSON.stringify({
        method: "subscribe",
        params: {
          source: "book",
          symbol,
          agg_level: 1
        }
      }));
      console.log(`[PacificaConnectionManager] Subscribed to orderbook for ${symbol}`);
    }
  }

  private subscribeTrades() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    for (const symbol of this.symbols) {
      this.ws.send(JSON.stringify({
        method: "subscribe",
        params: {
          source: "trade",
          symbol,
        }
      }));
      console.log(`[PacificaConnectionManager] Subscribed to trades for ${symbol}`);
    }
  }
}
