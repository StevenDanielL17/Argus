# Overview

Pacifica mainnet currently supports trading of over thirty five perpetual assets. Additional assets will be added based on community demand. <br>

* **Margin Systems:** Pacifica supports both Cross-Margin and Isolated-Margin trading.
* **Leverage:** Varies by market from 3x to 50x.

#### Explore each section for further explainations on:

* [Contract Specifications](https://pacifica.gitbook.io/closed-alpha/trading-on-pacifica/contract-specifications): Detailed specs of supported assets.
* [Oracle Price & Mark Price](https://pacifica.gitbook.io/closed-alpha/trading-on-pacifica/contract-specifications/oracle-price-and-mark-price) Breakdown of pricing mechanisms.
* [Order Types](https://pacifica.gitbook.io/closed-alpha/trading-on-pacifica/order-types): Definitions and trigger conditions.
* [Margin & Leverage](https://pacifica.gitbook.io/closed-alpha/trading-on-pacifica/margin-and-leverage): Margin system breakdown.
* [Funding Rates](https://pacifica.gitbook.io/closed-alpha/trading-on-pacifica/funding-rates): Calculations and methodology.
* [Trading Fees](https://pacifica.gitbook.io/closed-alpha/trading-on-pacifica/trading-fees): Fee/VIP structures.
* [Deposits & Withdrawals](https://pacifica.gitbook.io/closed-alpha/trading-on-pacifica/deposits-and-withdrawals): Pacifica currently implements a daily deposit and withdrawal limit.
* [Liquidations](https://pacifica.gitbook.io/closed-alpha/trading-on-pacifica/liquidations): Multi-tiered liquidation and risk management.<br>

*Access to Trading on Pacifica is strictly prohibited for individuals or entities residing in, incorporated in, or operating from, but not limited to, the United States of America, Cuba, the Crimean Peninsula (including Sevastopol), Iran, Afghanistan, Syria, and North Korea (collectively, the "Restricted Jurisdictions"). Access to trading functionality from IP addresses from any Restricted Jurisdiction is programmatically restricted.*

<br>
# Contract Specifications

Pacifica’s perpetual contracts let you seamlessly trade cryptocurrency assets with leverage, without the need for an expiration date. Understanding the specifications of these contracts is crucial for effective trading, risk management, and maximizing your trading potential.

Below is a summary of Pacifica’s key contract details. You can explore deeper into each specification through dedicated subpages linked below.

### Pacifica Contract Specifications

| Specification                               | Description                           | Details                                                                                                           |
| ------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Contract                                    | Type of perpetual contract            | Linear perpetual                                                                                                  |
| Contract Size                               | Size per contract                     | 1 unit of underlying spot asset                                                                                   |
| <p>IMM <br>(Initial Maintenance Margin)</p> | Margin required to open a position    | 1 / (user-selected leverage), dynamically increased when Open Interest sharply rises relative to liquidity        |
| MM                                          | Maintenance Margin                    | 50% of initial margin fraction                                                                                    |
| Dynamic Margin Adjustment                   | Margin requirement adjustments        | Yes (triggered by sharp increase in open interest vs. exchange liquidity, super-linear scaling of initial margin) |
| Oracle Price                                | Price used for liquidation & PnL      | Oracle-based (see Oracle Price)                                                                                   |
| Delivery / Expiration                       | Contract expiry                       | None (continuous with hourly funding payments)                                                                    |
| Position Limit                              | Maximum allowed position size         | No explicit limit per user (position size managed by dynamic margining)                                           |
| Account Type                                | Margin management style               | Per-wallet cross or isolated margin                                                                               |
| Funding Impact Notional                     | Notional size impacting funding rates | 20,000 USDC (BTC, ETH) 6,000 USDC (other assets)                                                                  |
| Maximum Market Order Value                  | Largest allowed market order          | $4M (leverage >=50), $1M (leverage 20-50),$500k (leverage 10-20), otherwise $250k                                 |
| Maximum Limit Order Value                   | Largest allowed limit order           | 10x— maximum market order value                                                                                   |

### Detailed Contract Information

Explore further details for each area:

* Trading Pairs: View all available perpetual markets.
* [Oracle Price](https://pacifica.gitbook.io/closed-alpha/trading-on-pacifica/contract-specifications/oracle-price-and-mark-price): Understand how Pacifica calculates the oracle-based Mark Price.

***

Use this overview as your quick-reference guide, and dive deeper into each subpage for full explanations.
# Oracle Price & Mark Price

Pacifica’s perpetual contracts use a decentralized Oracle Price to accurately value positions and determine funding rate and is a component of Mark Price. This Oracle Price protects traders by reducing manipulation risks and ensuring market stability. Mark Price is used for liquidations, margin requirements and Unrealized PnL.&#x20;

### Oracle Price Calculation

The oracle price is updated every 3 seconds and calculated as a weighted average of USDT denominated prices from major exchanges.

<table><thead><tr><th width="158">CEX</th><th>Weights</th></tr></thead><tbody><tr><td>Binance</td><td>2</td></tr><tr><td>OKX</td><td>1</td></tr><tr><td>Bybit</td><td>1</td></tr><tr><td>Hyperliquid</td><td>1</td></tr></tbody></table>

### Uses of Oracle Price on Pacifica

The Oracle Price is crucial for several Pacifica exchange operations:

* Funding Rates: Calculations rely on the Oracle Price to maintain alignment with spot markets.
* Mark Price Calculation: Oracle price serves as a component of Mark Price to prevent market manipulation and ensure the accuracy of settlements.

### Uses of Mark Price on Pacifica

The Mark Price is the median value of: \
1\. Oracle (spot) price\
2\. The median of best bid, best ask, and last trade on Pacifica\
3\. Perpetual price from major exchanges

The Mark Price is used for:&#x20;

* Liquidation Calculations: By using the median value of the 3 Mark Price components, Pacifica ensures fair and accurate liquidations.
* Margin Requirements: Both initial and maintenance margins are determined using the Mark Price.
* Unrealized PnL: Open positions are marked-to-market using the Mark Price.

### Transparency & Reliability

Pacifica provides transparent and verifiable Oracle Prices available directly through our trading interface or via API endpoints, ensuring trust and accountability.

***

For further details or technical questions, refer to our [API documentation](https://pacifica.gitbook.io/closed-alpha/api-documentation/api) or contact our support via [Contact Us](https://pacifica.gitbook.io/closed-alpha/other/contact-us).
# Pre-Markets

When Pacifica lists pre-markets that are not on other major exchanges, the oracle references Pacifica's mark price instead of external sources.\
\
An EMA is also applied to prevent oracle manipulation. This, combined with Pacifica's price band mechanic (+-30% of mark price) prevents extreme manipulation of pre-market perps.\
\
Once other major venues begin listing the same market, their pricing will be added to Pacifica's oracle reference in order to further strengthen its robustness. \
\
Additionally, Pacifica exercise strict open interest caps in pre-market pairs to prevent abnormal trading activity and market manipulation.
