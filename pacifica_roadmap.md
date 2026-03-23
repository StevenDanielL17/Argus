# Long-Term Vision and Roadmap

### Our Vision

Pacifica is building a full-stack decentralized exchange where performance never compromises custody. The end state is a venue where a trader can access every instrument they need, manage risk across a unified margin account, and execute with sub-10ms latency on both desktop and mobile, while builders are free to build on both Pacifica DEX and Pacifica L1.&#x20;

Pacifica builds in the open, with full API access from day one, and a builder program that treats external developers as partners, not threats. The exchange is the foundation and our ecosystem is the opportunity.

### What We Have Achieved

Building everything from scratch, we launched mainnet in June 2025 and reached the top spot for perpetual DEX volume on Solana by September. We're a small team and haven't taken outside funding.

<figure><img src="https://727612817-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FO2lcakUmUFILzrKCX989%2Fuploads%2FbK3eeVGZfW8U4v2jagBq%2Fimage.png?alt=media&#x26;token=8eb5cd58-0001-409d-878d-49cd7f39ea69" alt=""><figcaption></figcaption></figure>

Our architecture separates matching logic from settlement to achieve maximum performance. The matching engine operates off-chain for speed, delivering sub-10ms round trip API latency. Settlement and custody remain fully on-chain, non-custodial and verifiable. Users hold their keys at all times. This hybrid approach captures the performance benefits of centralized infrastructure while preserving the trust guarantees of decentralized settlement.

For context, most decentralized exchanges operate in the hundreds of milliseconds, and our latency is competitive with tier-1 centralized exchanges.

The full API has been available to all users from day one. Professional traders and market makers can connect freely with the same low-latency infrastructure.

We've shipped a complete desktop trading platform with advanced order types, sub-account functionality and AI agent analytics. We've launched a full-fledged builder program to support teams building atop Pacifica’s liquidity.

### Roadmap

Our development is organized in three stages, with our purpose-built Layer 1 chain underpinning the entire stack.

<figure><img src="https://727612817-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FO2lcakUmUFILzrKCX989%2Fuploads%2FAc4YFpyP09b63Axlz1ON%2FPacifica%20Roadmap%20(9).jpg?alt=media&#x26;token=b3a45c98-16e9-4a74-bfef-681f5cb0860e" alt=""><figcaption></figcaption></figure>

#### Phase 1: Foundation (Complete)

**Core trading engine:** \
Perpetual futures with up to 50x leverage, off-chain matching delivering sub-10ms round-trip latency, and on-chain settlement preserving non-custodial guarantees. We built deep liquidity through the market maker program and maintained tight spreads through sophisticated incentive design. Multi-chain integration provides seamless deposits and withdrawals.

We're still early, and the results so far validate our development approach.&#x20;

#### Phase 2: Capital Efficiency (In Progress)

This stage transforms Pacifica from a perpetual venue into a complete trading platform.

**Unified Trading Accounts:** \
A multi-collateral margin system that accepts spot assets as collateral across perpetual and spot positions. BTC, ETH, SOL, and other major assets become fungible collateral within a single margin account. Traders can maintain spot exposure while simultaneously using that collateral to trade derivatives. The system calculates cross-margined risk in real-time, maximizing capital efficiency while maintaining robust liquidation mechanics. No more capital fragmentation across isolated positions.

**Lending and Borrowing:** \
This integrates directly with the unified account system. When a trader's spot collateral is used to open perp positions, the system automatically borrows USD from the lending pool to cover negative USD balances. Interest rates are determined algorithmically based on utilization. For lenders, this creates a native yield opportunity backed by real trading demand rather than inflationary token emissions. The entire system operates transparently on-chain with airtight risk management in place.

**Mobile App:**\
This extends the platform to native iOS and Android applications built for speed and reliability. Full access to perpetuals, spot, and account management with the same low-latency backend infrastructure. Optimized for the constraints of mobile networks while maintaining feature parity with desktop.

#### Phase 3: Full Product Suite

**Spot Trading:** \
A high-performance spot orderbook that integrates directly with the multi-collateral system. This isn't an afterthought bolted onto a derivatives platform. Spot is a core primitive that enables unified trading accounts and flexible collateral management. The same matching engine architecture that powers our perpetuals ensures institutional-grade execution for spot markets.

**RWA and Exotic Derivatives:** \
**S**tocks, forex, options contracts, and structured products on-chain. One-touch options, double-no-touch options, and other instruments popular in traditional finance OTC markets become accessible to any trader with an internet connection. These products require sophisticated pricing models and robust risk management. We're building the infrastructure to handle that complexity while maintaining the UX standards that make them easily usable.

### Pacifica Layer 1

This is where everything comes together.

Our long-term infrastructure strategy is built around a core principle: maximize security and verifiability without sacrificing the high performance that serious traders demand. This requires purpose-built infrastructure at every layer.

Pacifica L1 is built on the Substrate framework, chosen for its modular Rust architecture, high flexibility, and ability to customize every layer of the stack, including consensus. We implement Fast HotStuff consensus, an optimized two-phase BFT protocol that achieves O(n) communication complexity through leader-based proposal aggregation. The chain achieves sub-second finality with throughput designed to scale with demand.

The runtime supports both native Rust business logic compiled to WASM for maximum performance and EVM/SVM compatibility for ecosystem interoperability. Developers can write in Rust, Solidity, or C++ depending on their performance requirements. Critical exchange logic runs in optimized WASM for maximum efficiency, while EVM/SVM compatibility ensures ecosystem interoperability.

**Progressive Decentralization**

Security comes in layers, and we're building each one methodically:

**Phase 1:** Fund state verifiability through on-chain deposit and withdrawal management. This exists today on Solana.

**Phase 2:** Internal state verifiability through Pacifica’s PC-BFT consensus. User positions, open orders, and account balances become transparently verifiable on-chain.

**Phase 3:** Execution logic verifiability through zero-knowledge proofs. Matching logic, liquidation calculations, and all core exchange computations become cryptographically provable.

Each stage increases the trust guarantees users have in the system while maintaining the performance that makes Pacifica competitive with centralized venues.

Exchange performance lives and dies at the infrastructure layer. Generalized blockchains optimize for flexibility. We optimize for one thing: the best trading experience.

True decentralization requires infrastructure built for the task. We're building it.

<br>
