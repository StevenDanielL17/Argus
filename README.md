# Argus — Signal-Execution Terminal
### *"Argus sees what no trader can — and trades on it."*

> **Pacifica Perpetuals Hackathon · March 16 – April 16, 2026**
> Track: Analytics & Data (Primary) · Trading Applications & Bots (Secondary)
> Builder: Solo · Status: Submitted

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [Requirements](#2-requirements)
3. [Solution Model](#3-solution-model)
4. [System Architecture](#4-system-architecture)
5. [Product](#5-product)
6. [Liquidation Risk Score — Signal Formula](#6-liquidation-risk-score--signal-formula)
7. [Builder Code & Monetization](#7-builder-code--monetization)
8. [Deployment](#8-deployment)
9. [Maintenance & Roadmap](#9-maintenance--roadmap)
10. [Hackathon Compliance](#10-hackathon-compliance)
11. [Acknowledgements](#11-acknowledgements)

---

## 1. The Problem

Pacifica has achieved sub-10ms execution, on-chain settlement, and #1 perp DEX volume on Solana — the infrastructure is institutional grade. But the tooling available to traders is not.

### What traders currently lack on Pacifica

**Signal blindness.** There is no way to monitor market-wide stress in real time. Traders cannot see when orderbook liquidity is thinning, when funding rates are approaching extreme levels, or when large-flow events are clustering — all signals that precede significant price moves.

**Fragmented data.** Funding rate, open interest, orderbook depth, and trade flow data are available via separate API endpoints. No tool aggregates them into a unified view with actionable interpretation.

**Slow execution on signals.** Even traders who identify a signal manually must navigate from their analytics tool to the exchange UI, fill in order parameters, and execute — a process that takes 10–30 seconds. In a volatile market, that is the entire move.

**No intelligence layer between data and action.** Institutional traders use terminals to compress data → signal → execution into a single workflow. Retail traders on Pacifica have no equivalent.

### The gap in one sentence

> Pacifica has institutional-grade infrastructure. Its traders have no **signal-execution loop**.

---

## 0. What Argus Actually Is

> **"Bloomberg for Pacifica"** is a positioning statement for judges and non-technical stakeholders. It communicates ambition. It is **not** the product identity.

**Bloomberg shows you data.** You still have to decide, switch tools, and execute manually.

**Argus collapses three separate workflows — monitor, interpret, execute — into one unbroken loop.** That loop does not exist anywhere on Pacifica today.

### The Real Innovation

| Category | Bloomberg | Trading Bots | **Argus** |
|----------|-----------|--------------|-----------|
| Shows live data | ✅ | ❌ | ✅ |
| Computes signals | ❌ | ✅ (black box) | ✅ (transparent) |
| One-click execution from signal | ❌ | ❌ (fully automated) | ✅ |
| Builder fee revenue in UI | ❌ | ❌ | ✅ |
| User stays in control | ✅ | ❌ | ✅ |

**Argus is neither a dashboard nor a bot.** It is the **bridge between them** — the first signal-execution loop built natively on Pacifica.

### Original Contributions

1. **The Liquidation Risk Score (LRS)** — A composite signal that doesn't exist on any exchange dashboard, builder, or tool anywhere on Pacifica. **You invented the formula.**

2. **Signal-to-execution in one click** — Trading directly from inside the analytics view. Bloomberg cannot trade. Argus trades.

3. **Live builder fee counter** — A DeFi-native monetization mechanic embedded in the UI itself. No Bloomberg equivalent exists.

> The LRS alone is novel enough to win. The signal-execution loop is what makes it unforgettable.

---

## 2. Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| F-01 | Real-time orderbook visualization with bid/ask pressure heatmap | Critical |
| F-02 | Live trade feed with large-flow detection above configurable threshold | Critical |
| F-03 | Funding rate monitor with historical chart and anomaly flagging | Critical |
| F-04 | Composite Liquidation Risk Score (LRS) derived from 3 rule-based signals | Critical |
| F-05 | One-click trade execution directly from any signal panel | Critical |
| F-06 | Builder code attached to every executed order | Critical |
| F-07 | Live builder fee revenue counter visible on dashboard | High |
| F-08 | Smart TP/SL auto-attached to executed orders | High |
| F-09 | Multi-asset market switching (BTC-PERP, ETH-PERP, SOL-PERP) | High |
| F-10 | Alert history log with timestamped signal events | Medium |
| F-11 | Configurable alert thresholds per signal type | Medium |
| F-12 | Mobile-responsive layout | Medium |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NF-01 | Orderbook render latency | < 100ms from data receipt to pixel |
| NF-02 | Signal computation latency | < 50ms from data to alert |
| NF-03 | Order execution round-trip | < 500ms intent to Pacifica confirmation |
| NF-04 | WebSocket reconnection recovery | < 3 seconds with orderbook re-sync |
| NF-05 | System availability | > 99% during demo window |
| NF-06 | Private key exposure | Zero — never leaves server environment |

### Constraints

- Pacifica API only — no external exchange data
- Rule-based signals exclusively — no ML models
- Single developer — 30-day build window
- All code written during hackathon period (March 16 – April 16, 2026)
- Ed25519 signing must be handled server-side

---

## 3. Solution Model

### Core Concept

Argus is a three-layer system that compresses the full trading workflow — **observe → interpret → act** — into a single interface.

```
OBSERVE                  INTERPRET                  ACT
───────────────────      ───────────────────────    ──────────────────
Raw market data    →     Composite risk signals  →  One-click orders
(orderbook, trades,      (LRS, whale alerts,        (signed, builder-
 funding, OI)            funding anomalies)          coded, TP/SL set)
```

### What Makes This Different

**Other dashboards** show data. Argus shows *what the data means* and lets you act on it without leaving the screen.

**Other bots** execute strategies blindly. Argus gives the trader visibility into *why* a signal fired and lets them choose to trade — or not.

**The builder code** turns every trade executed through Argus into a revenue event. Argus is not just a tool; it is a business.

### Signal Philosophy

All signals in Argus are:

- **Transparent** — every number on screen has a visible formula behind it
- **Explainable** — a trader can understand in 10 seconds why an alert fired
- **Actionable** — every signal has a "Trade this" button attached to it
- **Rule-based** — no black boxes, no model drift, no unexplained outputs

---

## 4. System Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PACIFICA EXCHANGE                         │
│  WebSocket: orderbook · trade feed · funding/OI             │
└──────────────────────────┬──────────────────────────────────┘
                           │ 3 persistent WS connections
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  ARGUS BACKEND  (Fastify / Node.js)         │
│                                                             │
│  ┌─────────────────┐    ┌──────────────────────────────┐   │
│  │   WS Manager    │───▶│      Signal Engine           │   │
│  │  - reconnect    │    │  - whaleDetector.ts          │   │
│  │  - heartbeat    │    │  - fundingAnomaly.ts         │   │
│  │  - snapshot     │    │  - orderbookImbalance.ts     │   │
│  │    on reconnect │    │  - liquidationScore.ts       │   │
│  └─────────────────┘    └──────────────┬───────────────┘   │
│                                        │                    │
│  ┌─────────────────────────────────────▼───────────────┐   │
│  │              Client Broadcaster (WS → Frontend)      │   │
│  │         Sends: market state + computed signals       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Execution Layer  (POST /api/execute)       │   │
│  │   signer.ts → orderBuilder.ts → pacificaClient.ts   │   │
│  │   [builder_code injected here on every order]        │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ WebSocket (signals) + REST (orders)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               ARGUS FRONTEND  (Next.js 14 / TypeScript)     │
│                                                             │
│  Zustand Stores                                             │
│  ├── orderbookStore     ← bid/ask levels, mid price         │
│  ├── tradeFeedStore     ← recent trades, whale flags        │
│  └── signalStore        ← LRS, funding score, alerts        │
│                                                             │
│  UI Components                                              │
│  ├── OrderbookHeatmap   (D3 canvas — bypasses React render) │
│  ├── TradeFeed          (virtualized list, whale highlights) │
│  ├── FundingRateChart   (TradingView Lightweight Charts)    │
│  ├── LiquidationGauge   (LRS 0–100, color-coded)            │
│  ├── SignalPanel        (active alerts + Trade buttons)     │
│  └── BuilderFeeCounter  (live accumulated fee revenue)      │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Frontend framework | Next.js 14 (App Router) + TypeScript | SSR shell, client components for live data, API routes for execution proxy |
| Styling | Tailwind CSS + shadcn/ui | Terminal aesthetic, unstyled primitives, zero fighting the design |
| Orderbook heatmap | D3.js on `<canvas>` | Bypasses React reconciler entirely — handles 20 redraws/second without lag |
| Charts | TradingView Lightweight Charts | Purpose-built for financial time series, handles 10k+ candles natively |
| State management | Zustand | High-frequency WS updates in 3 lines — Redux is too verbose for tick data |
| Backend | Fastify + Node.js | 2x faster than Express, native TypeScript, persistent process for WS |
| Signing | `@noble/ed25519` | Zero dependencies, works in Node, no full Solana SDK needed for signing only |
| WebSocket | Native browser WS + custom manager | No Socket.io overhead, full control over reconnection behavior |
| Hosting (frontend) | Vercel | Zero-config Next.js deployment |
| Hosting (backend) | Railway.app | Persistent process, single container, deployed closest to Pacifica's infrastructure |

### Data Flow — Latency Map

```
Pacifica WS  →  WS Manager  →  Signal Engine  →  Client Broadcast  →  Zustand Store  →  UI Render
    0ms             ~2ms            ~5ms               ~10ms               ~15ms           ~30ms
                                                                                      
                                                                       Total: ~62ms average signal-to-pixel
```

**Hot path:** Orderbook → D3 canvas render. Solved by rendering directly to canvas, not React DOM.  
**Critical path:** Trade intent → signed order → Pacifica. Network-bound, target < 500ms with Railway in closest region.

---

## 5. Product

### Interface Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  ARGUS  [BTC-PERP ▾]  Last: $94,230  24h: +2.4%   Builder fees: $0.47  │
├──────────────────────────┬──────────────────────────────────────────┤
│                          │  SIGNAL PANEL                            │
│   ORDERBOOK HEATMAP      │  ┌──────────────────────────────────┐   │
│                          │  │ 🔴 LRS: 74 — HIGH RISK           │   │
│   [D3 canvas heatmap]    │  │ Funding: +0.087% (extreme long)  │   │
│   Bids: green pressure   │  │ OI velocity: +8.3% / 5min        │   │
│   Asks: red pressure     │  │ Book depth: -34% vs baseline     │   │
│   Mid: price line        │  │ [TRADE THIS ↗]                   │   │
│                          │  └──────────────────────────────────┘   │
├──────────────────────────┤  ┌──────────────────────────────────┐   │
│  FUNDING RATE CHART      │  │ 🟡 Large flow detected           │   │
│  [TW Lightweight]        │  │ $127,400 BUY @ 94,215            │   │
│  Current: +0.087%        │  │ [FOLLOW THIS ↗]                  │   │
│  Anomaly flagged ⚠       │  └──────────────────────────────────┘   │
├──────────────────────────┴──────────────────────────────────────┤  │
│  LIVE TRADE FEED                                                    │
│  🐳 $127,400  BUY   94,215  12:04:31                               │
│      $8,200   SELL  94,198  12:04:29                               │
│      $3,100   BUY   94,201  12:04:27                               │
├─────────────────────────────────────────────────────────────────┤  │
│  EXECUTION PANEL                                                    │
│  [LONG]  [SHORT]   Size: [____]  TP: [auto]  SL: [auto]  [SEND] │
└─────────────────────────────────────────────────────────────────────┘
```

### Project Folder Structure

```
argus/
├── apps/
│   ├── web/                              # Next.js 14 frontend
│   │   ├── app/
│   │   │   ├── page.tsx                  # Dashboard root
│   │   │   ├── layout.tsx
│   │   │   └── api/execute/route.ts      # Proxies signed orders to backend
│   │   ├── components/
│   │   │   ├── orderbook/
│   │   │   │   └── OrderbookHeatmap.tsx  # D3 canvas component
│   │   │   ├── trades/
│   │   │   │   ├── TradeFeed.tsx
│   │   │   │   └── WhaleAlert.tsx
│   │   │   ├── signals/
│   │   │   │   ├── LiquidationRiskGauge.tsx
│   │   │   │   ├── FundingRateMonitor.tsx
│   │   │   │   └── SignalPanel.tsx
│   │   │   └── execution/
│   │   │       └── TradePanel.tsx
│   │   ├── stores/
│   │   │   ├── orderbookStore.ts
│   │   │   ├── tradeFeedStore.ts
│   │   │   └── signalStore.ts
│   │   ├── hooks/
│   │   │   └── useArgusSocket.ts         # WS connection to backend
│   │   └── lib/
│   │       └── wsManager.ts              # Reconnection + snapshot logic
│   │
│   └── server/                           # Fastify backend
│       └── src/
│           ├── index.ts
│           ├── ws/
│           │   ├── pacificaFeeds.ts       # Connects to Pacifica WS
│           │   └── clientBroadcast.ts
│           ├── signals/
│           │   ├── whaleDetector.ts
│           │   ├── fundingAnomaly.ts
│           │   ├── orderbookImbalance.ts
│           │   └── liquidationScore.ts   # LRS composite formula
│           ├── execution/
│           │   ├── signer.ts             # Ed25519 — key never leaves here
│           │   ├── orderBuilder.ts       # Injects BUILDER_CODE
│           │   └── pacificaClient.ts
│           └── routes/
│               └── execute.ts
│
├── packages/
│   └── shared/
│       └── types.ts                      # Signal, Order, MarketState interfaces
│
└── docs/
    ├── ARCHITECTURE.md
    ├── SIGNALS.md                        # LRS formula documentation
    └── BUILDER_CODE.md                   # Fee attribution explanation
```

---

## 6. Liquidation Risk Score — Signal Formula

The LRS is a composite score from 0–100 derived from three observable market inputs. No machine learning. No black boxes. Every component is explainable in one sentence.

### Input 1 — Funding Rate Pressure (FRP) · Weight: 40%

```
FRP = clamp( (|funding_rate| / 0.01) × 100, 0, 100 )

Threshold: 0.01 = 1% per hour (historically extreme)
Direction: positive funding → long liquidation risk
           negative funding → short liquidation risk
```

*When longs are paying an extreme premium to stay in their positions, the first large price drop will cascade.*

### Input 2 — Open Interest Velocity (OIV) · Weight: 35%

```
OIV = clamp( (|OI_now − OI_5min_ago| / OI_5min_ago) × 1000, 0, 100 )

Interpretation: 10% OI change in 5 minutes → OIV of 100 (maximum)
```

*Rapidly expanding open interest means leveraged exposure is building faster than the market can absorb it.*

### Input 3 — Orderbook Thinning Score (OTS) · Weight: 25%

```
OTS = clamp( 100 − ((bid_depth_2% + ask_depth_2%) / BASELINE_DEPTH × 100), 0, 100 )

bid_depth_2%   = sum of bid sizes within 2% of mid price
ask_depth_2%   = sum of ask sizes within 2% of mid price
BASELINE_DEPTH = rolling 1-hour average depth
```

*When the book thins below its baseline, liquidation cascades have less buffer to absorb them.*

### Composite Score

```
LRS = (FRP × 0.40) + (OIV × 0.35) + (OTS × 0.25)

Alert thresholds:
  LRS  0–30  → GREEN  — Normal market conditions
  LRS 30–60  → YELLOW — Elevated risk, monitor closely
  LRS 60–80  → ORANGE — High risk, signal surfaced prominently
  LRS 80–100 → RED    — Extreme risk, full-screen alert + audio cue

Cooldown: 15 minutes between alerts of the same type to prevent noise fatigue
```

---

## 7. Builder Code & Monetization

Every order executed through Argus embeds the registered Pacifica builder code in the order payload:

```json
{
  "symbol": "BTC-PERP",
  "side": "BUY",
  "type": "MARKET",
  "quantity": "0.1",
  "builder_code": "ARGUS_BUILDER_001"
}
```

The builder code is injected server-side in `orderBuilder.ts` and is never optional. It cannot be removed by the frontend. This ensures 100% attribution on all Argus-originated order flow.

### Revenue Visibility

The dashboard displays a live builder fee counter showing accumulated fees since session start. During the demo, this counter visually confirms that Argus is not a prototype — it is a deployed, revenue-generating product.

### User Consent Flow

Per Pacifica's Builder Program requirements:

1. On first connection, user is prompted to sign the builder consent message
2. Consent is stored client-side; the builder code is only injected after approval
3. Users can revoke consent at any time from the settings panel
4. Fee percentage is clearly disclosed before consent is given

---

## 8. Deployment

### Infrastructure

| Component | Platform | Reason |
|-----------|----------|--------|
| Frontend | Vercel | Zero-config Next.js, global CDN, free tier |
| Backend | Railway.app | Persistent Node.js process, WebSocket-compatible, single container |
| Environment secrets | Railway environment variables | `PRIVATE_KEY`, `BUILDER_CODE` never in source code |
| Domain | `argus.pacifica.tools` (proposed) | Clean, exchange-native branding |

### Environment Variables

```bash
# Server (.env — never committed)
PACIFICA_API_KEY=...
PACIFICA_PRIVATE_KEY=...          # Ed25519 private key — server only
BUILDER_CODE=ARGUS_BUILDER_001
PACIFICA_WS_URL=wss://app.pacifica.fi/ws
PACIFICA_REST_URL=https://app.pacifica.fi/api

# Frontend (public — safe to expose)
NEXT_PUBLIC_BACKEND_WS=wss://argus-backend.railway.app
NEXT_PUBLIC_BACKEND_REST=https://argus-backend.railway.app
```

### Deployment Steps

```bash
# 1. Clone and install
git clone https://github.com/[username]/argus
cd argus && pnpm install

# 2. Set environment variables in Railway dashboard
# 3. Deploy backend
railway up --service argus-server

# 4. Deploy frontend
vercel --prod

# 5. Verify WebSocket connection on live URL
# 6. Run a test order on testnet before mainnet demo
```

### Pre-Demo Checklist

- [ ] Backend process running and healthy on Railway
- [ ] WebSocket feeds connecting to Pacifica mainnet
- [ ] Orderbook heatmap rendering at 10+ fps
- [ ] LRS computing and updating on each tick
- [ ] Test order executed on testnet with builder code confirmed
- [ ] Builder fee counter incrementing correctly
- [ ] Mobile layout verified on phone
- [ ] Audio alerts tested and volume set appropriately for room
- [ ] Fallback: screen recording of live demo ready as backup

---

## 9. Maintenance & Roadmap

### Immediate Post-Hackathon (April 2026)

- Open source the signal engine under MIT license
- Publish builder code analytics dashboard for other Pacifica builders
- Add email/Telegram alert delivery for LRS threshold breaches
- Implement alert backtesting against 30-day historical data

### Phase 2 — Capital Efficiency Integration (Q2 2026)

Pacifica's roadmap includes unified multi-collateral margin and lending/borrowing. Argus will add:

- Collateral utilization monitor (BTC/ETH/SOL margin ratios)
- Borrow rate analytics and anomaly detection
- Cross-margin liquidation risk (enhanced LRS incorporating collateral health)

These are new data surfaces that no tool will have instrumented at Phase 2 launch. Argus will be there first.

### Phase 3 — Pacifica L1 Native (Q3–Q4 2026)

When Pacifica launches its Substrate-based L1 with Fast HotStuff consensus, Argus migrates with the ecosystem:

- Native L1 block-level data integration
- ZK-proof verified settlement monitoring
- Multi-chain collateral flow tracking

### Long-Term Monetization

| Revenue stream | Mechanism |
|----------------|-----------|
| Builder code fees | Earned on every order placed through Argus |
| Premium tier | Advanced signals, multi-asset, alert delivery — subscription |
| API access | Sell Argus signal feed to other builders via API |
| White-label | License the terminal to other Pacifica ecosystem projects |

---

## 10. Hackathon Compliance

| Rule | Compliance |
|------|------------|
| Solo submission | Yes — single registered builder |
| Pacifica API used | Yes — WebSocket feeds + REST execution + Builder Code |
| All work created during hackathon period (Mar 16 – Apr 16) | Yes — repository initialized March 16, 2026 |
| No pre-built projects or prior work | Confirmed — architecture and planning only prior to March 16 |
| External code/libraries acknowledged | See acknowledgements section |
| Builder code integrated | Yes — embedded in every executed order, server-side |
| Registered via official form | Yes |
| Discord joined | Yes |

---

## 11. Acknowledgements

This project was built during the Pacifica Hackathon (March 16 – April 16, 2026) as a solo submission.

**Open-source libraries used:**

- [Next.js](https://nextjs.org/) — MIT License
- [Fastify](https://fastify.dev/) — MIT License
- [Zustand](https://github.com/pmndrs/zustand) — MIT License
- [D3.js](https://d3js.org/) — ISC License
- [TradingView Lightweight Charts](https://github.com/tradingview/lightweight-charts) — Apache 2.0 License
- [@noble/ed25519](https://github.com/paulmillr/noble-ed25519) — MIT License
- [Tailwind CSS](https://tailwindcss.com/) — MIT License
- [shadcn/ui](https://ui.shadcn.com/) — MIT License

**Pacifica resources used:**

- Pacifica Python SDK (reference implementation for signing)
- Pacifica API Documentation at `docs.pacifica.fi`
- Pacifica Builder Program documentation
- Pacifica testnet at `test-app.pacifica.fi`

All signal logic, architecture, and application code is original work created during the hackathon window.

---

*Built for the Pacifica Hackathon 2026 · Argus — Real-Time Market Intelligence Terminal*  
*"Argus sees what no trader can — and trades on it."*