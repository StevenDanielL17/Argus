"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { OrderbookHeatmap } from "../components/orderbook/OrderbookHeatmap";
import { useOrderBookStore } from "../stores/orderbookStore";
import { TradeFeed } from "../components/trades/TradeFeed";
import { FundingRateMonitor } from "../components/signals/FundingRateMonitor";
import { LiquidationGauge } from "../components/signals/LiquidationGauge";
import { SignalPanel } from "../components/signals/SignalPanel";
import { SignalStats } from "../components/signals/SignalStats";
import { useTradeFeedStore } from "../stores/tradeFeedStore";
import { useSignalStore, type SignalEvent } from "../stores/signalStore";

type SignalBand = "green" | "yellow" | "orange" | "red";

type SignalPayload = {
  type: "market_tick";
  signal: {
    score: number;
    band: SignalBand;
    severity: string;
    reason: string;
    updatedAt: number;
  };
};

type OrderBookData = {
  type: "orderbook";
  bids: { price: number; size: number }[];
  asks: { price: number; size: number }[];
};

type TradeData = {
  type: "trade";
  trade: {
    symbol: string;
    timestamp: number;
    price: number;
    amount: number;
    value: number;
    side: "BUY" | "SELL";
    isWhale: boolean;
  };
};

type SignalEventData = {
  type: "signal_event";
  event: SignalEvent;
};

function isSignalPayload(value: unknown): value is SignalPayload {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Partial<SignalPayload>;
  return maybe.type === "market_tick" && !!maybe.signal;
}

function isOrderBookData(value: unknown): value is OrderBookData {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Partial<OrderBookData>;
  return maybe.type === "orderbook" && Array.isArray(maybe.bids);
}

function isTradeData(value: unknown): value is TradeData {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Partial<TradeData>;
  return maybe.type === "trade" && !!maybe.trade;
}

function isSignalEventData(value: unknown): value is SignalEventData {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Partial<SignalEventData>;
  return maybe.type === "signal_event" && !!maybe.event;
}

export default function HomePage() {
  const [status, setStatus] = useState("connecting");
  const [score, setScore] = useState<number | null>(null);
  const [band, setBand] = useState<SignalBand>("green");
  const [severity, setSeverity] = useState("low");
  const [reason, setReason] = useState("Waiting for signal feed...");
  const updateOrderBook = useOrderBookStore((s) => s.updateOrderBook);
  const addTrade = useTradeFeedStore((s) => s.addTrade);
  const addSignal = useSignalStore((s) => s.addSignal);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef(false);

  // Audio alert for critical/high severity signals
  const playAlertSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.value = 0.15;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Silently ignore audio errors
    }
  }, []);

  const connectWs = useCallback(() => {
    const wsUrl = process.env.NEXT_PUBLIC_BACKEND_WS ?? "ws://localhost:8080/ws/client";

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      const oldWs = wsRef.current;
      oldWs.onclose = null;
      oldWs.onerror = null;
      oldWs.onmessage = null;
      oldWs.close();
      wsRef.current = null;
    }

    intentionalCloseRef.current = false;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setStatus("connected");
    ws.onclose = () => {
      if (!intentionalCloseRef.current) {
        setStatus("disconnected");
        reconnectTimeoutRef.current = setTimeout(() => connectWs(), 3000);
      }
    };
    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setStatus("error");
    };
    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as unknown;
        if (isSignalPayload(parsed)) {
          setScore(parsed.signal.score);
          setBand(parsed.signal.band);
          setSeverity(parsed.signal.severity ?? "low");
          setReason(parsed.signal.reason);
        } else if (isOrderBookData(parsed)) {
          updateOrderBook(parsed.bids, parsed.asks);
        } else if (isTradeData(parsed)) {
          addTrade(parsed.trade);
        } else if (isSignalEventData(parsed)) {
          addSignal(parsed.event);
          // Audio alert for critical/high
          if (parsed.event.severity === "critical" || parsed.event.severity === "high") {
            playAlertSound();
          }
        }
      } catch {
        // Handle parsing errors silently
      }
    };
  }, [updateOrderBook, addTrade, addSignal, playAlertSound]);

  useEffect(() => {
    const restUrl = process.env.NEXT_PUBLIC_BACKEND_REST ?? "http://localhost:8080";
    fetch(`${restUrl}/health`)
      .then((r) => r.json())
      .then((d) => console.log("Backend healthy:", d.ok))
      .catch((e) => console.error("Backend unhealthy:", e));

    connectWs();

    return () => {
      intentionalCloseRef.current = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWs]);

  return (
    <>
      {/* Connection status indicator */}
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          padding: "6px 14px",
          borderRadius: 20,
          background: status === "connected" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
          border: `1px solid ${status === "connected" ? "#10b981" : "#ef4444"}`,
          color: status === "connected" ? "#10b981" : "#ef4444",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.5px",
          zIndex: 1000,
          backdropFilter: "blur(8px)",
        }}
      >
        {status === "connected" ? "● Live" : "● Disconnected"}
      </div>

      <main style={{ maxWidth: 960, margin: "48px auto", padding: "0 16px" }}>
        <h1 style={{ marginBottom: 8 }}>Argus Terminal</h1>
        <p style={{ marginTop: 0, color: "#96a7c0", marginBottom: 24 }}>
          Real-time market intelligence for Pacifica
        </p>

        {/* Signal Stats Bar */}
        <section style={{ marginBottom: 16 }}>
          <SignalStats />
        </section>

        {/* Two-column layout: Orderbook + LRS Gauge */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, marginBottom: 16 }}>
          <section>
            <OrderbookHeatmap />
          </section>
          <section>
            <LiquidationGauge
              score={score}
              band={band}
              severity={severity}
              reason={reason}
            />
          </section>
        </div>

        {/* Two-column layout: Trade Feed + Signal Panel */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <section>
            <TradeFeed />
          </section>
          <section>
            <SignalPanel />
          </section>
        </div>

        {/* Funding Rate Chart - full width */}
        <section style={{ marginBottom: 24 }}>
          <FundingRateMonitor />
        </section>
      </main>
    </>
  );
}
