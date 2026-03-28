import WebSocket from "ws";
import { config } from "../config.js";

type SubscriptionCallback = (data: Buffer | string) => void;

export class PacificaConnectionManager {
  private ws: WebSocket | null = null;
  private url: string;
  private symbols: string[];
  private callbacks: SubscriptionCallback[] = [];

  private reconnectInterval = 2000; // Start at 2s
  private maxReconnectInterval = 30000; // Max 30s
  private isIntentionalClose = false;
  private isConnecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private lastMessageTime: number = Date.now();
  private staleConnectionTimeout = 10000; // 10s without message = stale

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
    this.lastMessageTime = Date.now();

    // Clean up any existing connection
    if (this.ws) {
      try { this.ws.removeAllListeners(); this.ws.close(); } catch { }
      this.ws = null;
    }

    this.ws = new WebSocket(this.url);

    this.ws.on("open", () => {
      console.log(`[PacificaConnectionManager] Connected to ${this.url}`);
      this.isConnecting = false;
      this.reconnectInterval = 2000; // Reset backoff
      this.startHeartbeat();
      this.subscribe();
      this.subscribeTrades();
    });

    this.ws.on("message", (data: WebSocket.RawData) => {
      this.lastMessageTime = Date.now();
      for (const cb of this.callbacks) {
        cb(data as Buffer | string);
      }
    });

    this.ws.on("close", (code, reason) => {
      this.isConnecting = false;
      this.stopHeartbeat();
      if (!this.isIntentionalClose) {
        console.warn(`[PacificaConnectionManager] Connection closed (code: ${code}). Reconnecting...`);
        this.scheduleReconnect();
      }
    });

    this.ws.on("error", (err: Error) => {
      this.isConnecting = false;
      this.stopHeartbeat();
      console.error(`[PacificaConnectionManager] Error:`, err.message);
    });

    this.ws.on("pong", () => {
      // Heartbeat response received
      this.lastMessageTime = Date.now();
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Check if connection is stale (no messages for 30s)
        if (Date.now() - this.lastMessageTime > 30000) {
          console.warn(`[PacificaConnectionManager] Stale connection detected (>30s). Reconnecting...`);
          this.ws.terminate();
          return;
        }
        // Send ping every 10s to keep connection alive
        try {
          this.ws.ping();
        } catch {
          // Connection lost
        }
      }
    }, 10000); // Check every 10s
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    console.warn(`[PacificaConnectionManager] Reconnecting in ${Math.round(this.reconnectInterval / 1000)}s...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectInterval);
    this.reconnectInterval = Math.min(this.maxReconnectInterval, this.reconnectInterval * 1.5);
  }

  public disconnect() {
    this.isIntentionalClose = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try { this.ws.removeAllListeners(); this.ws.close(); } catch { }
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
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.warn("[PacificaConnectionManager] Trade subscription failed:", message);
    }
  }
}
