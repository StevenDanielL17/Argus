import { create } from 'zustand';

type OrderBookLevel = { price: number; size: number };
type OrderBookState = {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  midPrice: number | null;
  updateOrderBook: (bids: OrderBookLevel[], asks: OrderBookLevel[]) => void;
};

export const useOrderBookStore = create<OrderBookState>((set) => ({
  bids: [],
  asks: [],
  midPrice: null,
  updateOrderBook: (bids, asks) => {
    const midBid = bids[0]?.price ?? 0;
    const midAsk = asks[0]?.price ?? 0;
    const midPrice = midBid && midAsk ? (midBid + midAsk) / 2 : null;
    set({ bids, asks, midPrice });
  },
}));
