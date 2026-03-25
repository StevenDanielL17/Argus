import { computeLiquidationRiskScore } from "./signals/liquidationScore.js";

console.log("Starting Benchmark...");

// Generate Mock Orderbook with N levels
function generateOrderbook(levels: number) {
  const bids = [];
  const asks = [];
  let currentBid = 100000;
  let currentAsk = 100001;
  const step = 0.5;

  for (let i = 0; i < levels; i++) {
    bids.push({ p: currentBid.toString(), a: (Math.random() * 10).toFixed(4), n: 1 });
    currentBid -= step;
    
    asks.push({ p: currentAsk.toString(), a: (Math.random() * 10).toFixed(4), n: 1 });
    currentAsk += step;
  }

  return { l: [bids, asks], s: "BTC-PERP", t: Date.now() };
}

function processOrderbook(data: any) {
  const bids = data.l[0];
  const asks = data.l[1];

  const highestBid = parseFloat(bids[0].p);
  const lowestAsk = parseFloat(asks[0].p);
  const midPrice = (highestBid + lowestAsk) / 2;

  const depthWindowPct = 0.02;
  const lowerBound = midPrice * (1 - depthWindowPct);
  const upperBound = midPrice * (1 + depthWindowPct);

  let bidDepth2pct = 0;
  for (const bid of bids) {
    const price = parseFloat(bid.p);
    if (price >= lowerBound) {
      bidDepth2pct += parseFloat(bid.a);
    }
  }

  let askDepth2pct = 0;
  for (const ask of asks) {
    const price = parseFloat(ask.p);
    if (price <= upperBound) {
      askDepth2pct += parseFloat(ask.a);
    }
  }

  return { bidDepth2pct, askDepth2pct };
}

const N_ITERATIONS = 10000;
const LEVELS = 5000; // Deep orderbook
const mockData = generateOrderbook(LEVELS);

console.log(`Benchmarking Orderbook Parsing (Levels: ${LEVELS}, Iterations: ${N_ITERATIONS})`);
const startOrderbook = performance.now();
for (let i = 0; i < N_ITERATIONS; i++) {
  processOrderbook(mockData);
}
const endOrderbook = performance.now();
console.log(`Orderbook processing took: ${(endOrderbook - startOrderbook).toFixed(2)}ms (${((endOrderbook - startOrderbook) / N_ITERATIONS).toFixed(4)}ms per tick)`);

console.log(`\nBenchmarking Liquidation Score Calculation (Iterations: ${N_ITERATIONS})`);
const startScore = performance.now();
for (let i = 0; i < N_ITERATIONS; i++) {
  computeLiquidationRiskScore(
    { symbol: "BTC-PERP", timestamp: Date.now(), fundingRate: 0.01, openInterest: 1500000, bidDepth2pct: 50000, askDepth2pct: 50000 },
    1400000,
    120000
  );
}
const endScore = performance.now();
console.log(`Liquidation Score calculation took: ${(endScore - startScore).toFixed(2)}ms (${((endScore - startScore) / N_ITERATIONS).toFixed(4)}ms per tick)`);
