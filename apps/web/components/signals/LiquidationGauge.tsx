"use client";

import { useMemo } from "react";

interface LiquidationGaugeProps {
  score: number | null;
  band: "green" | "yellow" | "orange" | "red";
  severity: string;
  reason: string;
}

const BAND_COLORS: Record<string, string> = {
  green: "#10b981",
  yellow: "#eab308",
  orange: "#f97316",
  red: "#ef4444",
};

export function LiquidationGauge({ score, band, severity, reason }: LiquidationGaugeProps) {
  const displayScore = score ?? 0;
  const color = BAND_COLORS[band] ?? "#94a3b8";

  // Parse sub-scores from reason string (format: "FRP=x.x OIV=x.x OTS=x.x")
  const subScores = useMemo(() => {
    const match = reason.match(/FRP=([\d.]+)\s+OIV=([\d.]+)\s+OTS=([\d.]+)/);
    if (!match) return null;
    return {
      frp: parseFloat(match[1]),
      oiv: parseFloat(match[2]),
      ots: parseFloat(match[3]),
    };
  }, [reason]);

  // SVG arc calculation for the gauge
  const radius = 70;
  const strokeWidth = 10;
  const circumference = Math.PI * radius; // Semi-circle
  const progress = (displayScore / 100) * circumference;

  return (
    <div
      style={{
        border: "1px solid #2e3a4a",
        borderRadius: 12,
        padding: 20,
        background: "linear-gradient(145deg, #141a22 0%, #0f1218 100%)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12, letterSpacing: "1px" }}>
        LIQUIDATION RISK SCORE
      </div>

      {/* SVG Gauge */}
      <svg
        width="180"
        height="100"
        viewBox="0 0 180 100"
        style={{ display: "block", margin: "0 auto" }}
      >
        {/* Background arc */}
        <path
          d="M 15 90 A 70 70 0 0 1 165 90"
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d="M 15 90 A 70 70 0 0 1 165 90"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          style={{
            transition: "stroke-dasharray 0.5s ease, stroke 0.3s ease",
            filter: `drop-shadow(0 0 6px ${color}40)`,
          }}
        />
        {/* Score text */}
        <text
          x="90"
          y="75"
          textAnchor="middle"
          fill={color}
          fontSize="28"
          fontWeight="700"
          style={{ transition: "fill 0.3s ease" }}
        >
          {score === null ? "--" : Math.round(displayScore)}
        </text>
        <text x="90" y="95" textAnchor="middle" fill="#64748b" fontSize="11">
          / 100
        </text>
      </svg>

      {/* Band label */}
      <div
        style={{
          display: "inline-block",
          padding: "4px 14px",
          borderRadius: 20,
          background: `${color}15`,
          border: `1px solid ${color}40`,
          color,
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginTop: 8,
        }}
      >
        {band} — {severity}
      </div>

      {/* Sub-scores */}
      {subScores && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            marginTop: 16,
            fontSize: 11,
            color: "#94a3b8",
          }}
        >
          <SubScore label="FRP" value={subScores.frp} weight="40%" />
          <SubScore label="OIV" value={subScores.oiv} weight="35%" />
          <SubScore label="OTS" value={subScores.ots} weight="25%" />
        </div>
      )}
    </div>
  );
}

function SubScore({ label, value, weight }: { label: string; value: number; weight: string }) {
  const color = value >= 80 ? "#ef4444" : value >= 60 ? "#f97316" : value >= 30 ? "#eab308" : "#10b981";
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color, fontWeight: 600, fontSize: 14 }}>{value.toFixed(0)}</div>
      <div>
        {label} <span style={{ color: "#475569" }}>({weight})</span>
      </div>
    </div>
  );
}
