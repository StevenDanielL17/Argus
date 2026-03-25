"use client";

import { useEffect, useRef } from "react";
import { scaleLinear } from "d3";
import { useOrderBookStore } from "../../stores/orderbookStore";

export function OrderbookHeatmap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { bids, asks, midPrice } = useOrderBookStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const maxLevels = 20;
    const barHeight = canvas.height / (maxLevels * 2);

    // Color scales
    const bidColor = scaleLinear<string, string>()
      .domain([0, maxLevels])
      .range(["#064e3b", "#10b981"]);

    const askColor = scaleLinear<string, string>()
      .domain([0, maxLevels])
      .range(["#7f1d1d", "#ef4444"]);

    // Draw bids (green, bottom-up)
    bids.slice(0, maxLevels).forEach((level, i) => {
      const width = Math.min(level.size * 100, canvas.width);
      ctx.fillStyle = bidColor(i);
      ctx.fillRect(0, canvas.height - (i + 1) * barHeight, width, barHeight - 1);
    });

    // Draw asks (red, top-down)
    asks.slice(0, maxLevels).forEach((level, i) => {
      const width = Math.min(level.size * 100, canvas.width);
      ctx.fillStyle = askColor(i);
      ctx.fillRect(0, i * barHeight, width, barHeight - 1);
    });

    // Draw mid price line
    if (midPrice) {
      const y = maxLevels * barHeight;
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }, [bids, asks, midPrice]);

  return (
    <div style={{ border: "1px solid #2e3a4a", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: 8, background: "#1a2332", fontSize: 12 }}>
        ORDERBOOK HEATMAP {midPrice && `| Mid: $${midPrice.toLocaleString()}`}
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        style={{ display: "block", width: "100%", height: "auto" }}
      />
    </div>
  );
}
