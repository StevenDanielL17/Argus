// TODO: Implement historical signal simulation
// - Load historical orderbook/trade data from Pacifica REST API
// - Replay through signal detectors
// - Calculate accuracy metrics (true positive rate, false alarm rate)
// - Export to CSV for analysis

export async function runBacktest(symbol: string, days: number) {
  console.warn("[Backtest] Historical signal backtesting not yet implemented");
  return {
    symbol,
    days,
    signals: [] as unknown[],
    accuracy: 0,
    totalEvents: 0,
  };
}
