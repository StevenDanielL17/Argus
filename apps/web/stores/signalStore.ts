import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SignalEvent = {
  id: string;
  type: "whale" | "funding_anomaly" | "orderbook_imbalance" | "liquidation_risk";
  severity: "low" | "medium" | "high" | "critical";
  symbol: string;
  message: string;
  value?: number;
  timestamp: number;
};

type SignalState = {
  signals: SignalEvent[];
  addSignal: (signal: SignalEvent) => void;
  clearSignals: () => void;
};

export const useSignalStore = create<SignalState>()(
  persist(
    (set) => ({
      signals: [],
      addSignal: (signal) =>
        set((state) => ({
          signals: [signal, ...state.signals].slice(0, 50),
        })),
      clearSignals: () => set({ signals: [] }),
    }),
    { name: "argus-signals" }
  )
);
