"use client";

import { useState } from "react";
import { useSignalStore, type SignalEvent } from "../../stores/signalStore";

const SEVERITY_ICONS: Record<string, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🟢",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#10b981",
};

type FilterLevel = "all" | "critical" | "high" | "medium" | "low";

export function SignalPanel() {
  const signals = useSignalStore((s) => s.signals);
  const clearSignals = useSignalStore((s) => s.clearSignals);
  const [filter, setFilter] = useState<FilterLevel>("all");

  const filteredSignals = signals.filter((s) => {
    if (filter === "all") return true;
    const order = ["low", "medium", "high", "critical"];
    return order.indexOf(s.severity) >= order.indexOf(filter);
  });

  return (
    <div style={{ border: "1px solid #2e3a4a", borderRadius: 8, overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          padding: "8px 12px",
          background: "#1a2332",
          fontSize: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ letterSpacing: "0.5px" }}>
          SIGNAL PANEL{" "}
          <span style={{ color: "#64748b" }}>({filteredSignals.length})</span>
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterLevel)}
            style={{
              background: "#0f1218",
              border: "1px solid #2e3a4a",
              color: "#94a3b8",
              fontSize: 11,
              padding: "2px 6px",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            <option value="all">All Alerts</option>
            <option value="critical">🔴 Critical</option>
            <option value="high">🟠 High+</option>
            <option value="medium">🟡 Medium+</option>
            <option value="low">🟢 All</option>
          </select>
          <button
            onClick={clearSignals}
            style={{
              background: "transparent",
              border: "1px solid #374151",
              color: "#64748b",
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Alert list */}
      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {filteredSignals.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "#475569", fontSize: 12 }}>
            No alerts yet — monitoring market...
          </div>
        ) : (
          filteredSignals.map((signal) => (
            <SignalRow key={signal.id} signal={signal} />
          ))
        )}
      </div>
    </div>
  );
}

function SignalRow({ signal }: { signal: SignalEvent }) {
  const icon = SEVERITY_ICONS[signal.severity] ?? "⚪";
  const color = SEVERITY_COLORS[signal.severity] ?? "#94a3b8";
  const time = new Date(signal.timestamp).toLocaleTimeString();

  return (
    <div
      style={{
        padding: "8px 12px",
        borderBottom: "1px solid #1a2332",
        display: "flex",
        alignItems: "center",
        gap: 10,
        background:
          signal.severity === "critical"
            ? "rgba(239, 68, 68, 0.06)"
            : signal.severity === "high"
            ? "rgba(249, 115, 22, 0.04)"
            : undefined,
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color, fontWeight: 500 }}>
          {signal.message}
        </div>
        <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
          {signal.symbol} · {signal.type.replace("_", " ")} · {time}
        </div>
      </div>
      {signal.value !== undefined && (
        <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>
          {signal.type === "whale"
            ? `$${signal.value.toLocaleString()}`
            : signal.type === "funding_anomaly"
            ? `${(signal.value * 100).toFixed(4)}%`
            : signal.type === "orderbook_imbalance"
            ? `${signal.value.toFixed(1)}:1`
            : String(signal.value)}
        </span>
      )}
    </div>
  );
}
