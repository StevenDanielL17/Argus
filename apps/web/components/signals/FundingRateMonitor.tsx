"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, LineSeries, type IChartApi, type ISeriesApi } from "lightweight-charts";

export function FundingRateMonitor() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [latestRate, setLatestRate] = useState<number | null>(null);
  const [isAnomaly, setIsAnomaly] = useState(false);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 200,
      layout: {
        background: { type: ColorType.Solid, color: "#1a2332" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#2e3a4a" },
        horzLines: { color: "#2e3a4a" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "#2e3a4a",
      },
    });

    chartInstanceRef.current = chart;

    const lineSeries = chart.addSeries(LineSeries, {
      color: "#10b981",
      lineWidth: 2,
      crosshairMarkerVisible: true,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => `${(price * 100).toFixed(4)}%`,
      },
    });

    lineSeriesRef.current = lineSeries;

    // Mock funding rate data (replace with real Pacifica REST polling later)
    const now = Math.floor(Date.now() / 1000);
    const data = Array.from({ length: 60 }, (_, i) => ({
      time: (now - (59 - i) * 60) as any,
      value: (Math.random() - 0.3) * 0.02,
    }));

    lineSeries.setData(data);

    const latest = data[data.length - 1]?.value ?? 0;
    setLatestRate(latest);
    setIsAnomaly(Math.abs(latest) > 0.0005); // 0.05%

    // Handle resize
    const handleResize = () => {
      if (chartRef.current) {
        chart.applyOptions({ width: chartRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  const rateDisplay = latestRate !== null ? `${(latestRate * 100).toFixed(4)}%` : "--";
  const rateColor = latestRate !== null
    ? latestRate > 0 ? "#10b981" : "#ef4444"
    : "#94a3b8";

  return (
    <div style={{ border: "1px solid #2e3a4a", borderRadius: 8, overflow: "hidden" }}>
      <div style={{
        padding: "8px 12px",
        background: "#1a2332",
        fontSize: 12,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span>
          FUNDING RATE{" "}
          <span style={{ color: rateColor, fontWeight: 600 }}>
            {rateDisplay}
          </span>
        </span>
        {isAnomaly && (
          <span style={{ color: "#fbbf24", fontWeight: 600 }}>
            ⚠ Anomaly Detected
          </span>
        )}
      </div>
      <div ref={chartRef} />
    </div>
  );
}
