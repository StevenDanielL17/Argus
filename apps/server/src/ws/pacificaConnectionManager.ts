import WebSocket from "ws";
import { config } from "../config.js";

type SubscriptionCallback = (data: Buffer | string) => void;

export class PacificaConnectionManager {
  private ws: WebSocket | null = null;
  private url: string;
  private symbols: string[];
  private callbacks: SubscriptionCallback[] = [];
  
  private reconnectInterval = 500;
  private maxReconnectInterval = 5000;
  private isIntentionalClose = false;
  private isConnecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(url: string, symbols: string[]) {
    this.url = url;
    this.symbols = symbols;
  }

  public connect() {
    // Prevent overlapping connect() calls
    if (this.isConnecting) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    this.isIntentionalClose = false;
    this.isConnecting = true;

    // Clean up any existing connection
    if (this.ws) {
      try { this.ws.removeAllListeners(); this.ws.close(); } catch {}
      this.ws = null;
    }

    this.ws = new WebSocket(this.url);

    this.ws.on("open", () => {
      console.log(`[PacificaConnectionManager] Connected to ${this.url}`);
      this.isConnecting = false;
      this.reconnectInterval = 500; // Reset backoff
      this.subscribe();
      this.subscribeTrades();
    });

    this.ws.on("message", (data: WebSocket.RawData) => {
      for (const cb of this.callbacks) {
        cb(data as Buffer | string);
      }
    });

    this.ws.on("close", () => {
      this.isConnecting = false;
      if (!this.isIntentionalClose) {
        this.scheduleReconnect();
      }
    });

    this.ws.on("error", (err: Error) => {
      this.isConnecting = false;
      console.error(`[PacificaConnectionManager] Error:`, err.message);
    });
  }

  private scheduleReconnect() {
    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    console.warn(`[PacificaConnectionManager] Reconnecting in ${Math.round(this.reconnectInterval)}ms...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectInterval);
    this.reconnectInterval = Math.min(this.maxReconnectInterval, this.reconnectInterval * 1.5);
  }

  public disconnect() {
    this.isIntentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try { this.ws.removeAllListeners(); this.ws.close(); } catch {}
      this.ws = null;
    }
    this.isConnecting = false;
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
    try {
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
    } catch (e: any) {
      console.warn("[PacificaConnectionManager] Trade subscription failed:", e?.message ?? e);
    }
  }
}
