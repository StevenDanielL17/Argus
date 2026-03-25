"use client";

import { useSignalStore } from "../../stores/signalStore";

export function SignalStats() {
  const signals = useSignalStore((s) => s.signals);

  const stats = {
    total: signals.length,
    whales: signals.filter((s) => s.type === "whale").length,
    funding: signals.filter((s) => s.type === "funding_anomaly").length,
    imbalance: signals.filter((s) => s.type === "orderbook_imbalance").length,
    critical: signals.filter((s) => s.severity === "critical").length,
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        fontSize: 11,
        padding: "8px 12px",
        background: "#1a2332",
        borderRadius: 8,
        border: "1px solid #2e3a4a",
        justifyContent: "center",
        flexWrap: "wrap",
      }}
    >
      <Stat label="Alerts" value={stats.total} />
      <Stat label="🐋 Whales" value={stats.whales} />
      <Stat label="⚠ Funding" value={stats.funding} />
      <Stat label="📊 Imbalance" value={stats.imbalance} />
      <Stat label="🔴 Critical" value={stats.critical} color="#ef4444" />
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <span style={{ color: "#94a3b8" }}>
      {label}:{" "}
      <strong style={{ color: color ?? "#d7e2f0" }}>{value}</strong>
    </span>
  );
}
