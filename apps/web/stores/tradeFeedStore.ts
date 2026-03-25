import { create } from "zustand";

export type Trade = {
  symbol: string;
  timestamp: number;
  price: number;
  amount: number;
  value: number;
  side: "BUY" | "SELL";
  isWhale: boolean;
};

type TradeFeedState = {
  trades: Trade[];
  addTrade: (trade: Trade) => void;
};

export const useTradeFeedStore = create<TradeFeedState>((set) => ({
  trades: [],
  addTrade: (trade) =>
    set((state) => ({
      trades: [trade, ...state.trades].slice(0, 50), // Keep last 50
    })),
}));
