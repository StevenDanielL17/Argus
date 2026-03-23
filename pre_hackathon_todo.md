# Argus — Pre-Hackathon Research Plan (Mar 1 – Mar 16)

> **Rule:** No project code before March 16. Research, design, and learn only.

---

## Phase 1: API Deep Dive (Mar 1 – Mar 5)

- [ ] **Set up testnet account** at https://test-app.pacifica.fi (code: "Pacifica")
- [ ] **Clone Python SDK** from https://github.com/pacifica-fi/python-sdk and read every file
- [ ] **Map every REST endpoint** — document request/response shapes, rate limits, auth requirements
  - [ ] Market data endpoints (orderbook, trades, ticker, funding rates)
  - [ ] Account endpoints (positions, balances, orders, trade history)
  - [ ] Order endpoints (market, limit, stop, TP/SL)
  - [ ] Builder endpoints (approve, revoke, update fee rate, overview, trades, leaderboard)
  - [ ] Referral endpoint (claim code)
- [ ] **Map every WebSocket channel** — document message formats, subscription patterns
  - [ ] Orderbook stream (depth, frequency, snapshot vs delta)
  - [ ] Trade stream (fields available per trade — size, side, timestamp)
  - [ ] Account stream (position updates, order fills, balance changes)
- [ ] **Identify data gaps** — what's NOT available via API:
  - [ ] Can you get individual wallet positions? (likely no)
  - [ ] Is there a liquidation history endpoint?
  - [ ] Is there historical funding rate data or only current?
  - [ ] Is there aggregate open interest per symbol?
  - [ ] What's the max orderbook depth returned?

---

## Phase 2: Signing & Auth Mastery (Mar 6 – Mar 8)

- [ ] **Read signing implementation docs** at https://docs.pacifica.fi/api-documentation/api/signing/implementation
- [ ] **Understand the full signing flow:**
  - [ ] Payload construction (type + data fields)
  - [ ] Recursive JSON key sorting (alphabetical)
  - [ ] Compact JSON string generation
  - [ ] Ed25519 signature generation
  - [ ] Timestamp + expiry window handling
- [ ] **Manually replicate each signed request type in Python (testnet):**
  - [ ] Create market order
  - [ ] Create limit order
  - [ ] Set TP/SL
  - [ ] Approve builder code
  - [ ] Revoke builder code
- [ ] **Document the signing flow in pseudocode** for JS/TS reimplementation on March 16
- [ ] **Research JS Ed25519 libraries:**
  - [ ] `@noble/ed25519` — pure JS, no WASM dependency
  - [ ] `tweetnacl` — mature, widely used
  - [ ] `@solana/web3.js` — Solana keypair signing (since Pacifica uses Solana-style keys)
  - [ ] Pick one and note the API surface

---

## Phase 3: Builder Code Setup (Mar 9 – Mar 10)

- [ ] **Email ops@pacifica.fi** to onboard to the Builder Program
- [ ] **Get your builder code** assigned (alphanumeric, max 16 chars)
- [ ] **Understand fee mechanics:**
  - [ ] How `fee_rate` vs `max_fee_rate` interaction works
  - [ ] What fee % is realistic (check existing builders if possible)
  - [ ] How fees are settled and when they're claimable
- [ ] **Test builder code flow on testnet:**
  - [ ] Self-approve builder code on a test wallet
  - [ ] Place order with builder code attached
  - [ ] Verify fee attribution via `builder/trades` endpoint
- [ ] **Document builder code useful endpoints:**
  - [ ] `/builder/overview?account=` — your builder stats
  - [ ] `/builder/trades?builder_code=` — trade history through your code
  - [ ] `/leaderboard/builder_code?builder_code=` — user leaderboard

---

## Phase 4: Tech Stack & Architecture Design (Mar 11 – Mar 13)

- [ ] **Finalize frontend stack decision:**
  - [ ] Framework: Next.js (App Router) vs Vite + React
  - [ ] Charting: Lightweight Charts (TradingView open source) vs D3.js vs Recharts
  - [ ] WebSocket client: native WebSocket vs `socket.io-client` vs custom reconnecting wrapper
  - [ ] State management: Zustand (lightweight) vs Jotai (atomic)
  - [ ] Styling: Tailwind CSS + shadcn/ui (fast, professional look)
- [ ] **Design the data flow architecture:**
  ```
  Pacifica WS → WebSocket Manager → Data Store (Zustand)
                                        ↓
                              React Components (live updates)
                                        ↓
                              Signal Engine (derived computations)
                                        ↓
                              Trade Executor (REST + signing)
  ```
- [ ] **Wireframe each view (paper or Figma):**
  - [ ] Main dashboard (orderbook heatmap + funding + alerts)
  - [ ] Signal panel (funding anomalies, large trade flow, risk score)
  - [ ] Trade execution panel (one-click from signal, TP/SL config)
  - [ ] Settings (API key, builder code config, alert thresholds)
- [ ] **Define the "Liquidation Risk Score" formula:**
  - [ ] Inputs: funding rate deviation, OI change rate, orderbook depth thinning, spread widening
  - [ ] Output: 0-100 composite score
  - [ ] Research: are there papers or existing models for liquidation cascade risk?
- [ ] **Define "large trade" threshold per asset** (e.g., >$50K for BTC, >$20K for alts)

---

## Phase 5: Competitive Recon & Demo Prep (Mar 14 – Mar 15)

- [ ] **Join Pacifica Discord** and monitor:
  - [ ] Builder Channel — what are others building?
  - [ ] API Channel — what problems are people hitting?
  - [ ] Hackathon Stage — any announced office hours schedule?
- [ ] **Register for hackathon** via https://forms.gle/1FP2EuvZqYiP7Tiy7
- [ ] **Review judging criteria and weight your effort:**
  - [ ] Innovation (novel signals, liquidation risk = differentiator)
  - [ ] Technical Execution (clean code, solid API integration)
  - [ ] User Experience (this is where web UI wins over Python scripts)
  - [ ] Potential Impact (builder code revenue = real adoption signal)
  - [ ] Presentation (rehearse demo script, plan backup video)
- [ ] **Write demo script outline** (2-3 min walkthrough):
  - [ ] Open Argus → live data flowing immediately
  - [ ] Show funding rate anomaly → click to trade → builder code attached
  - [ ] Show liquidation risk score spiking → explain the formula
  - [ ] Show builder code revenue dashboard → "this is a business, not a project"
- [ ] **Prepare boilerplate** (allowed — it's scaffolding, not the project):
  - [ ] `npx create-next-app` or `npm create vite` — bare project
  - [ ] Install deps: tailwind, shadcn/ui, zustand, charting lib, ed25519 lib
  - [ ] Set up folder structure: `/components`, `/lib`, `/hooks`, `/services`
  - [ ] NO Argus-specific code — just the empty shell

---

## Phase 6: Day Before Launch (Mar 16 morning)

- [ ] **Verify testnet still works** — API keys, WebSocket connections
- [ ] **Confirm builder code is active**
- [ ] **Clear schedule for the next 30 days** — block time for focused work
- [ ] **Review this todo list one final time** — anything missed?
- [ ] **Begin coding at hackathon start** 🚀

---

## Quick Reference Links

| Resource | URL |
|----------|-----|
| Testnet | https://test-app.pacifica.fi |
| API Docs | https://docs.pacifica.fi/api-documentation/api |
| Python SDK | https://github.com/pacifica-fi/python-sdk |
| Builder Program | https://docs.pacifica.fi/builder-program |
| Signing Docs | https://docs.pacifica.fi/api-documentation/api/signing/implementation |
| Hackathon Registration | https://forms.gle/1FP2EuvZqYiP7Tiy7 |
| Submission Form | https://forms.gle/zYm9ZBH1SoUE9t9o7 |
| Discord | https://discord.gg/pacifica |
| Builder Onboarding | ops@pacifica.fi |
