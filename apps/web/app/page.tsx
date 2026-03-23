"use client";

import { useEffect, useMemo, useState } from "react";

type SignalBand = "green" | "yellow" | "orange" | "red";

type SignalPayload = {
  type: "market_tick";
  signal: { score: number; band: SignalBand; reason: string; updatedAt: number };
};

function isSignalPayload(value: unknown): value is SignalPayload {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Partial<SignalPayload>;
  return maybe.type === "market_tick" && !!maybe.signal;
}

const colors: Record<SignalBand, string> = {
  green: "#1f9d55",
  yellow: "#d9a21b",
  orange: "#e07a1f",
  red: "#d83434"
};

export default function HomePage() {
  const [status, setStatus] = useState("connecting");
  const [score, setScore] = useState<number | null>(null);
  const [band, setBand] = useState<SignalBand>("green");
  const [reason, setReason] = useState("Waiting for signal feed...");

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_BACKEND_WS ?? "ws://localhost:8080/ws/client";
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setStatus("connected");
    ws.onclose = () => setStatus("disconnected");
    ws.onerror = () => setStatus("error");
    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as unknown;
        if (isSignalPayload(parsed)) {
          setScore(parsed.signal.score);
          setBand(parsed.signal.band);
          setReason(parsed.signal.reason);
        }
      } catch {
        setStatus("error");
      }
    };

    return () => ws.close();
  }, []);

  const scoreText = useMemo(() => (score === null ? "--" : score.toFixed(2)), [score]);

  return (
    <main style={{ maxWidth: 860, margin: "48px auto", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 8 }}>Argus Terminal</h1>
      <p style={{ marginTop: 0, color: "#96a7c0" }}>
        Day 1 foundation build: live signal stream, reliability baseline, and configurable runtime.
      </p>

      <section
        style={{
          border: "1px solid #2e3a4a",
          borderRadius: 12,
          padding: 20,
          background: "linear-gradient(145deg, #141a22 0%, #0f1218 100%)"
        }}
      >
        <p>
          Connection: <strong>{status}</strong>
        </p>
        <p>
          Liquidation Risk Score: <strong style={{ color: colors[band] }}>{scoreText}</strong>
        </p>
        <p>
          Band: <strong style={{ color: colors[band], textTransform: "uppercase" }}>{band}</strong>
        </p>
        <p style={{ color: "#9eb0c8" }}>{reason}</p>
      </section>
    </main>
  );
}
