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

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const maxLevels = 20;
    const barHeight = canvas.height / (maxLevels * 2);

    const topBids = bids.slice(0, maxLevels);
    const topAsks = asks.slice(0, maxLevels);

    // Compute max size across both sides for normalization
    const allSizes = [...topBids, ...topAsks].map((l) => l.size);
    const maxSize = Math.max(...allSizes, 0.001); // avoid div by 0

    // Color scales
    const bidColor = scaleLinear<string, string>()
      .domain([0, maxLevels])
      .range(["#064e3b", "#10b981"]);

    const askColor = scaleLinear<string, string>()
      .domain([0, maxLevels])
      .range(["#7f1d1d", "#ef4444"]);

    // Draw asks (red, top half — price ascending from mid)
    topAsks.forEach((level, i) => {
      const width = (level.size / maxSize) * canvas.width;
      ctx.fillStyle = askColor(i);
      ctx.fillRect(0, i * barHeight, width, barHeight - 1);

      // Price label
      ctx.fillStyle = "#64748b";
      ctx.font = "10px monospace";
      ctx.fillText(`$${level.price.toLocaleString()}`, width + 4, i * barHeight + barHeight - 3);
    });

    // Draw mid price line
    const midY = maxLevels * barHeight;
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(canvas.width, midY);
    ctx.stroke();

    if (midPrice) {
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`MID $${midPrice.toLocaleString()}`, 4, midY - 4);
    }

    // Draw bids (green, bottom half — price descending from mid)
    topBids.forEach((level, i) => {
      const width = (level.size / maxSize) * canvas.width;
      const y = midY + i * barHeight + 1; // +1 to offset from the midline
      ctx.fillStyle = bidColor(i);
      ctx.fillRect(0, y, width, barHeight - 1);

      // Price label
      ctx.fillStyle = "#64748b";
      ctx.font = "10px monospace";
      ctx.fillText(`$${level.price.toLocaleString()}`, width + 4, y + barHeight - 3);
    });
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
        style={{ display: "block", width: "100%", height: "auto", background: "#0f1218" }}
      />
    </div>
  );
}
