"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { sanitizeInput, sanitizeNumber, safeFormatNumber, safeFormatCurrency, createWSMessage } from "../lib/security";
import "./terminal.css";

type SignalBand = "GREEN" | "YELLOW" | "ORANGE" | "RED";

interface Signal {
  score: number;
  band: SignalBand;
  severity: string;
  reason: string;
  updatedAt: number;
}

interface MarketTick {
  symbol: string;
  timestamp: number;
  fundingRate: number;
  openInterest: number;
  bidDepth2pct: number;
  askDepth2pct: number;
}

interface Trade {
  symbol: string;
  timestamp: number;
  price: number;
  amount: number;
  value: number;
  side: "BUY" | "SELL";
  isWhale: boolean;
}

interface Alert {
  type: string;
  message: string;
  timestamp: number;
  severity?: string;
}

interface OrderbookLevel {
  price: number;
  size: number;
}

export default function ArgusTerminal() {
  // Connection state
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("connecting");

  // Market data
  const [score, setScore] = useState<number>(0);
  const [band, setBand] = useState<SignalBand>("GREEN");
  const [tick, setTick] = useState<MarketTick | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [orderbook, setOrderbook] = useState<{ bids: OrderbookLevel[]; asks: OrderbookLevel[] } | null>(null);

  // Execution state
  const [execSide, setExecSide] = useState<"BUY" | "SELL" | null>(null);
  const [execSize, setExecSize] = useState("");
  const [execPrice, setExecPrice] = useState("");
  const [execSymbol, setExecSymbol] = useState("BTC-PERP");
  const [execStatus, setExecStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI state
  const [whaleFilter, setWhaleFilter] = useState(false);
  const [latency, setLatency] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const intentionalCloseRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_RECONNECTS = 10;
  const MAX_RECONNECT_DELAY = 30000; // 30 seconds max

  // Audio alert
  const playAlertSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.value = 0.1;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // Silent
    }
  }, []);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  // Message handler
  const handleMessage = useCallback((data: any) => {
    const { type, tick: newTick, signal, trade, alert, bids, asks } = data;

    if (type === "market_tick" && newTick && signal) {
      const sanitizedTick: MarketTick = {
        symbol: sanitizeInput(newTick.symbol),
        timestamp: sanitizeNumber(newTick.timestamp),
        fundingRate: sanitizeNumber(newTick.fundingRate, -1, 1),
        openInterest: sanitizeNumber(newTick.openInterest, 0),
        bidDepth2pct: sanitizeNumber(newTick.bidDepth2pct, 0),
        askDepth2pct: sanitizeNumber(newTick.askDepth2pct, 0),
      };

      setTick(sanitizedTick);
      setScore(sanitizeNumber(signal.score, 0, 100));
      setBand((signal.band as SignalBand) ?? "GREEN");
    }

    if (type === "trade" && trade) {
      const sanitizedTrade: Trade = {
        symbol: sanitizeInput(trade.symbol),
        timestamp: sanitizeNumber(trade.timestamp),
        price: sanitizeNumber(trade.price, 0),
        amount: sanitizeNumber(trade.amount, 0),
        value: sanitizeNumber(trade.value, 0),
        side: (trade.side === "BUY" ? "BUY" : "SELL") as "BUY" | "SELL",
        isWhale: !!trade.isWhale,
      };
      setTrades((prev) => [sanitizedTrade, ...prev.slice(0, 49)]);
    }

    if (type === "alert" && alert) {
      const sanitizedAlert: Alert = {
        type: sanitizeInput(alert.type),
        message: sanitizeInput(alert.message),
        timestamp: sanitizeNumber(alert.timestamp),
        severity: alert.severity ? sanitizeInput(alert.severity) : undefined,
      };
      setAlerts((prev) => [sanitizedAlert, ...prev.slice(0, 19)]);

      if (sanitizedAlert.severity === "critical" || sanitizedAlert.severity === "high") {
        playAlertSound();
      }
    }

    if (type === "orderbook" && bids && asks) {
      const sanitizedOrderbook = {
        bids: bids.map((b: any) => ({
          price: sanitizeNumber(b.price, 0),
          size: sanitizeNumber(b.size, 0),
        })).slice(0, 50),
        asks: asks.map((a: any) => ({
          price: sanitizeNumber(a.price, 0),
          size: sanitizeNumber(a.size, 0),
        })).slice(0, 50),
      };
      setOrderbook(sanitizedOrderbook);
    }
  }, [playAlertSound]);

  // Heartbeat to keep connection alive
  const scheduleHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current);
    }
    heartbeatTimerRef.current = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // Send ping to keep connection alive
        try {
          wsRef.current.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
          scheduleHeartbeat();
        } catch {
          // Connection lost
        }
      }
    }, 15000); // Heartbeat every 15 seconds
  }, []);

  // WebSocket connection with exponential backoff and jitter
  const connectWs = useCallback((immediate = false) => {
    const wsUrl = process.env.NEXT_PUBLIC_BACKEND_WS ?? "ws://localhost:8080/ws/client";

    // Clear existing connection
    clearTimers();
    if (wsRef.current) {
      try {
        wsRef.current.onclose = null; // Prevent reconnect trigger
        wsRef.current.close();
      } catch { }
      wsRef.current = null;
    }

    intentionalCloseRef.current = false;

    const attemptConnection = () => {
      if (intentionalCloseRef.current) return;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setStatus("connected");
          reconnectAttemptsRef.current = 0;
          console.log("[Terminal] WebSocket connected");
          scheduleHeartbeat();
        };

        ws.onclose = (event) => {
          if (!intentionalCloseRef.current) {
            setStatus("disconnected");
            clearTimers();

            if (reconnectAttemptsRef.current < MAX_RECONNECTS) {
              reconnectAttemptsRef.current++;
              // Exponential backoff with jitter: baseDelay * 2^attempts + random jitter
              const baseDelay = 1000;
              const exponentialDelay = baseDelay * Math.pow(2, reconnectAttemptsRef.current - 1);
              const jitter = Math.random() * 1000; // 0-1s jitter
              const delay = Math.min(exponentialDelay + jitter, MAX_RECONNECT_DELAY);

              console.log(`[Terminal] Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECTS})`);
              reconnectTimerRef.current = setTimeout(() => {
                if (!intentionalCloseRef.current) {
                  attemptConnection();
                }
              }, delay);
            } else {
              console.error("[Terminal] Max reconnection attempts reached");
              setStatus("error");
            }
          }
        };

        ws.onerror = () => {
          setStatus("error");
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            // Handle pong responses from heartbeat
            if (data.type === "pong") {
              scheduleHeartbeat();
              return;
            }
            handleMessage(data);
          } catch (e) {
            console.error("[Terminal] Failed to parse message:", e);
          }
        };
      } catch (error) {
        console.error("[Terminal] Failed to create WebSocket:", error);
        setStatus("error");
      }
    };

    if (immediate) {
      attemptConnection();
    } else {
      reconnectTimerRef.current = setTimeout(attemptConnection, 100);
    }
  }, [clearTimers, scheduleHeartbeat, handleMessage]);

  // Health check
  useEffect(() => {
    const restUrl = process.env.NEXT_PUBLIC_BACKEND_REST ?? "http://localhost:8080";
    fetch(`${restUrl}/health`)
      .then((r) => r.json())
      .then((d) => console.log("Backend healthy:", d.ok))
      .catch((e) => console.error("Backend unhealthy:", e));

    connectWs(true);

    // Latency simulation
    const latencyInterval = setInterval(() => {
      setLatency(Math.floor(Math.random() * 30) + 10);
    }, 2000);

    // Clock
    const clockInterval = setInterval(() => {
      const el = document.getElementById("clock");
      if (el) el.innerText = new Date().toISOString().split("T")[1].split(".")[0] + " UTC";
    }, 1000);

    return () => {
      intentionalCloseRef.current = true;
      clearTimers();
      if (wsRef.current) {
        try {
          wsRef.current.onclose = null; // Prevent reconnect trigger
          wsRef.current.close();
        } catch { }
        wsRef.current = null;
      }
      clearInterval(latencyInterval);
      clearInterval(clockInterval);
    };
  }, [connectWs, clearTimers]);

  // Execution handler
  const handleExecute = useCallback(async () => {
    if (!execSide) {
      setExecStatus("Please select BUY or SELL first");
      return;
    }

    const size = sanitizeNumber(execSize, 0.0001);
    if (size <= 0) {
      setExecStatus("Please enter a valid size");
      return;
    }

    const price = execPrice ? sanitizeNumber(execPrice, 0.01) : undefined;

    setExecStatus("Submitting order...");
    setIsSubmitting(true);

    try {
      const restUrl = process.env.NEXT_PUBLIC_BACKEND_REST ?? "http://localhost:8080";
      const response = await fetch(`${restUrl}/api/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": `${execSymbol}-${execSide}-${size}-${Date.now()}`,
        },
        body: JSON.stringify({
          symbol: sanitizeInput(execSymbol),
          side: execSide,
          type: price ? "LIMIT" : "MARKET",
          quantity: size.toString(),
          price: price?.toString(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setExecStatus(`✓ Order executed: ${result.orderId}`);
        setExecSize("");
        setExecPrice("");
      } else {
        setExecStatus(`✗ Failed: ${sanitizeInput(result.error || "Unknown error")}`);
      }
    } catch (error: any) {
      setExecStatus(`✗ Error: ${sanitizeInput(error.message || "Unknown error")}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [execSide, execSize, execPrice, execSymbol]);

  // Computed values
  const midPrice = useMemo(() => {
    if (!orderbook || orderbook.bids.length === 0 || orderbook.asks.length === 0) return 0;
    return (orderbook.bids[0].price + orderbook.asks[0].price) / 2;
  }, [orderbook]);

  const imbalance = useMemo(() => {
    if (!orderbook) return 0;
    const totalBid = orderbook.bids.reduce((sum, b) => sum + b.size, 0);
    const totalAsk = orderbook.asks.reduce((sum, a) => sum + a.size, 0);
    return totalBid - totalAsk;
  }, [orderbook]);

  const filteredTrades = useMemo(() => {
    return whaleFilter ? trades.filter((t) => t.isWhale) : trades;
  }, [trades, whaleFilter]);

  const getBandColor = useCallback((b: SignalBand) => {
    switch (b) {
      case "RED": return "bg-error text-on-error";
      case "ORANGE": return "bg-[#f57c00] text-white";
      case "YELLOW": return "bg-yellow-500 text-black";
      default: return "bg-tertiary text-on-tertiary-fixed";
    }
  }, []);

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      {/* TopNavBar */}
      <nav className="flex justify-between items-center w-full px-6 py-3 bg-[#131313] border-b border-[#424656]/15 sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <span className="text-xl font-black text-[#00daf3] tracking-tighter font-headline">ARGUS</span>
          <span className="text-xs font-mono text-outline tracking-wider">MARKET INTELLIGENCE TERMINAL</span>
          <div className="hidden md:flex items-center gap-4 ml-8">
            <span className="flex items-center gap-1 text-[10px] font-mono text-tertiary">
              <span className="w-2 h-2 bg-tertiary rounded-full animate-pulse"></span>
              LIVE
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-[10px] font-mono text-outline">
            <span className="material-symbols-outlined text-xs">sensors</span>
            <span className={status === "connected" ? "text-tertiary" : "text-error"}>
              {status === "connected" ? "CONNECTED" : "DISCONNECTED"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-outline">
            <span className="material-symbols-outlined text-xs">speed</span>
            <span>{latency} MS</span>
          </div>
          <div className="text-[10px] font-mono text-outline" id="clock">--:--:-- UTC</div>
        </div>
      </nav>

      {/* SideNavBar */}
      <aside className="fixed left-0 top-[61px] h-[calc(100vh-61px)] flex flex-col items-center py-6 z-40 bg-[#1c1b1b] border-r border-[#424656]/15 w-[88px]">
        <div className="flex flex-col w-full">
          <a className="flex flex-col items-center justify-center border-l-2 border-[#00daf3] bg-[#353534] text-[#00daf3] w-full py-4" href="#">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-['Inter'] text-[9px] font-medium uppercase tracking-widest mt-1">Dashboard</span>
          </a>
          <a className="flex flex-col items-center justify-center text-[#c2c6d8] w-full py-4 opacity-70 hover:bg-[#2a2a2a] hover:opacity-100" href="#">
            <span className="material-symbols-outlined">show_chart</span>
            <span className="font-['Inter'] text-[9px] font-medium uppercase tracking-widest mt-1">Signals</span>
          </a>
          <a className="flex flex-col items-center justify-center text-[#c2c6d8] w-full py-4 opacity-70 hover:bg-[#2a2a2a] hover:opacity-100" href="#">
            <span className="material-symbols-outlined">receipt_long</span>
            <span className="font-['Inter'] text-[9px] font-medium uppercase tracking-widest mt-1">Trades</span>
          </a>
        </div>
        <div className="flex flex-col w-full mt-auto">
          <a className="flex flex-col items-center justify-center text-[#c2c6d8] w-full py-4 opacity-70 hover:bg-[#2a2a2a] hover:opacity-100" href="#">
            <span className="material-symbols-outlined">settings</span>
            <span className="font-['Inter'] text-[9px] font-medium uppercase tracking-widest mt-1">Settings</span>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-[88px] mb-8 p-6 min-h-[calc(100vh-61px)]">
        {/* LRS Signal Banner */}
        <div className="mb-6 p-4 bg-surface-container-highest border-l-4 border-tertiary flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-tertiary text-3xl">analytics</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline text-2xl font-bold text-tertiary">LRS: {score.toFixed(0)}</span>
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${getBandColor(band)}`}>{band}</span>
              </div>
              <p className="text-[10px] text-outline uppercase tracking-widest mt-1">Liquidation Risk Score</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[10px] text-outline uppercase">Funding Rate</div>
              <div className="font-mono text-sm text-primary">{tick ? (tick.fundingRate * 100).toFixed(4) + "%" : "--"}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-outline uppercase">Open Interest</div>
              <div className="font-mono text-sm">{tick ? "$" + (tick.openInterest / 1000000).toFixed(2) + "M" : "--"}</div>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-12 gap-4">
          {/* Trade Feed */}
          <section className="col-span-12 lg:col-span-6 bg-surface-container p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-headline text-xs font-bold tracking-widest text-outline uppercase">Live Trade Feed</h3>
              <label className="flex items-center gap-1 text-[9px] text-outline uppercase cursor-pointer">
                <input type="checkbox" checked={whaleFilter} onChange={(e) => setWhaleFilter(e.target.checked)} className="accent-primary" />
                Whales Only
              </label>
            </div>
            <div className="h-[280px] overflow-y-auto bg-surface-container-lowest p-2 space-y-1">
              {filteredTrades.length === 0 ? (
                <div className="p-4 text-center">
                  <span className="material-symbols-outlined text-outline text-2xl">receipt_long</span>
                  <p className="text-[10px] text-outline uppercase mt-2">Waiting for trades...</p>
                </div>
              ) : (
                filteredTrades.map((trade, i) => (
                  <div key={`${trade.timestamp}-${i}`} className={`flex justify-between items-center p-2 bg-surface-container-lowest border-l-2 ${trade.isWhale ? "border-[#e07a1f] bg-[#e07a1f]/10" : trade.side === "BUY" ? "border-tertiary" : "border-error"}`}>
                    <div className="flex items-center gap-2">
                      {trade.isWhale && <span>🐋</span>}
                      <span className={`text-[10px] font-bold ${trade.side === "BUY" ? "text-tertiary" : "text-error"}`}>{trade.side}</span>
                      <span className="text-[9px] font-mono">${safeFormatNumber(trade.price)}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-mono">{trade.amount.toFixed(4)}</div>
                      <div className="text-[8px] text-outline">{new Date(trade.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Execution Panel */}
          <section className="col-span-12 lg:col-span-6 bg-surface-container-highest p-6 border-t-2 border-primary">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-headline text-lg font-black tracking-tight uppercase">Order Execution</h2>
              <div className="bg-surface-container-lowest px-3 py-1 text-[10px] font-mono text-tertiary flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-tertiary rounded-full animate-pulse"></span>
                READY
              </div>
            </div>

            <div className="mb-4">
              <label className="block font-['Inter'] text-[9px] font-medium uppercase tracking-widest text-outline mb-2">Symbol</label>
              <select value={execSymbol} onChange={(e) => setExecSymbol(e.target.value)} className="w-full bg-surface-container-lowest border-none text-on-surface font-headline font-bold text-lg p-3 focus:ring-1 focus:ring-primary">
                <option value="BTC-PERP">BTC-PERP</option>
                <option value="SOL-PERP">SOL-PERP</option>
                <option value="ETH-PERP">ETH-PERP</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => setExecSide("BUY")} className={`gradient-primary text-on-primary font-headline font-black py-4 text-center tracking-tighter text-sm uppercase glow-primary hover:opacity-90 transition-opacity ${execSide === "BUY" ? "ring-2 ring-tertiary" : ""}`}>BUY / LONG</button>
              <button onClick={() => setExecSide("SELL")} className={`bg-surface-container-highest text-outline font-headline font-black py-4 text-center tracking-tighter text-sm uppercase border border-outline-variant/20 hover:text-error hover:border-error/50 transition-colors ${execSide === "SELL" ? "ring-2 ring-error" : ""}`}>SELL / SHORT</button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[9px] font-medium uppercase text-outline mb-1">Size</label>
                <input value={execSize} onChange={(e) => setExecSize(e.target.value)} className="w-full bg-surface-container-lowest border-none font-mono text-on-surface p-3 focus:ring-1 focus:ring-primary" placeholder="0.00" type="number" step="0.01" />
              </div>
              <div>
                <label className="block text-[9px] font-medium uppercase text-outline mb-1">Limit Price (Optional)</label>
                <input value={execPrice} onChange={(e) => setExecPrice(e.target.value)} className="w-full bg-surface-container-lowest border-none font-mono text-on-surface p-3 focus:ring-1 focus:ring-primary" placeholder="Market" type="number" step="0.01" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10">
              <span className="text-[9px] text-outline uppercase">Builder Code</span>
              <span className="font-mono text-[10px] text-primary">ARGUS_BUILDER_001</span>
            </div>

            <button onClick={handleExecute} disabled={isSubmitting} className="w-full bg-surface-container-highest hover:bg-surface-bright py-4 text-sm font-black uppercase tracking-widest transition-colors mt-4 border border-outline-variant/20 disabled:opacity-50">
              {isSubmitting ? "PROCESSING..." : "CONFIRM & EXECUTE"}
            </button>

            <div className="mt-3 text-center text-[9px] font-mono text-outline">{execStatus}</div>
          </section>

          {/* Market Stats */}
          <section className="col-span-12 lg:col-span-4 bg-surface-container-low p-4">
            <h3 className="font-headline text-[9px] font-bold tracking-widest uppercase text-outline mb-4 border-b border-outline-variant/15 pb-2">Market Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-outline uppercase">Mid Price</span>
                <span className="font-mono text-sm text-primary">{midPrice > 0 ? "$" + safeFormatNumber(midPrice) : "--"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-outline uppercase">Bid Depth (2%)</span>
                <span className="font-mono text-sm">{tick ? tick.bidDepth2pct.toFixed(2) : "--"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-outline uppercase">Ask Depth (2%)</span>
                <span className="font-mono text-sm">{tick ? tick.askDepth2pct.toFixed(2) : "--"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-outline uppercase">Imbalance</span>
                <span className={`font-mono text-sm ${imbalance > 0 ? "text-tertiary" : imbalance < 0 ? "text-error" : "text-outline"}`}>{imbalance !== 0 ? (imbalance > 0 ? "+" : "") + imbalance.toFixed(2) : "--"}</span>
              </div>
            </div>
          </section>

          {/* Alert History */}
          <section className="col-span-12 lg:col-span-4 bg-surface-container-low p-4">
            <h3 className="font-headline text-[9px] font-bold tracking-widest uppercase text-outline mb-4 border-b border-outline-variant/15 pb-2">Alert History</h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="text-[9px] text-outline text-center py-4">No alerts yet</div>
              ) : (
                alerts.map((alert, i) => (
                  <div key={`${alert.timestamp}-${i}`} className="p-2 bg-surface-container-lowest border-l-2 border-primary">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-sm">notifications_active</span>
                      <span className="text-[9px] text-on-surface">{alert.type}</span>
                    </div>
                    <div className="text-[8px] text-outline mt-1">{alert.message}</div>
                    <div className="text-[7px] text-outline mt-1">{new Date(alert.timestamp).toLocaleTimeString()}</div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* System Status */}
          <section className="col-span-12 lg:col-span-4 bg-surface-container-low p-4">
            <h3 className="font-headline text-[9px] font-bold tracking-widest uppercase text-outline mb-4 border-b border-outline-variant/15 pb-2">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-tertiary rounded-full"></span>
                <span className="text-[10px] text-outline uppercase">WebSocket: <span className="text-tertiary">{status === "connected" ? "Connected" : "Disconnected"}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-tertiary rounded-full"></span>
                <span className="text-[10px] text-outline uppercase">REST API: <span className="text-tertiary">Online</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-tertiary rounded-full"></span>
                <span className="text-[10px] text-outline uppercase">Symbol: <span className="text-primary">{execSymbol}</span></span>
              </div>
              <div className="text-[9px] text-outline mt-4 pt-3 border-t border-outline-variant/10">
                <p>Argus Terminal v0.1.0</p>
                <p className="mt-1">Built for Pacifica Hackathon 2026</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Material Icons & Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;800;900&family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
    </div>
  );
}
