"use client";

import { useTradeFeedStore } from "../../stores/tradeFeedStore";

export function TradeFeed() {
  const trades = useTradeFeedStore((s) => s.trades);

  return (
    <div style={{ border: "1px solid #2e3a4a", borderRadius: 8 }}>
      <div style={{ padding: 8, background: "#1a2332", fontSize: 12 }}>
        LIVE TRADE FEED
      </div>
      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {trades.length === 0 ? (
          <p style={{ padding: 16, color: "#666" }}>No trades yet...</p>
        ) : (
          trades.map((trade) => (
            <div
              key={`${trade.timestamp}-${trade.side}-${trade.price}`}
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid #1a2332",
                background: trade.isWhale ? "rgba(224, 122, 31, 0.1)" : undefined,
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
              }}
            >
              <span style={{ color: trade.side === "BUY" ? "#10b981" : "#ef4444" }}>
                {trade.isWhale && "🐋 "}{trade.side}
              </span>
              <span>${trade.price.toLocaleString()}</span>
              <span>{trade.amount.toFixed(2)}</span>
              <span style={{ color: "#666" }}>
                ${trade.value.toLocaleString()}
              </span>
              <span style={{ color: "#666" }}>
                {new Date(trade.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
