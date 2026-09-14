# Calculations

This is a high-risk reference. Before modifying financial logic, inspect the implementation files directly.

## Primary Calculation Files

| File | Functions | Consumers |
| --- | --- | --- |
| `src/lib/portfolio-summary.ts` | `calculatePortfolioPerformance()`, `getPortfolioSummary()` | Home, portfolio list, portfolio detail valuation. |
| `src/lib/portfolio-positions.ts` | `buildPortfolioPositionsAnalytics()` | Portfolio detail, open asset detail, closed position detail. |
| `src/components/PortfolioTransactionsTable.tsx` | `getTransactionAmount()` | Transaction table total column. |
| `src/lib/portfolio-format.ts` | Formatting helpers | UI display only. |

## Shared Assumptions In Current Code

- Currency display is hard-coded to `USD`.
- Numeric math uses JavaScript `number`, not Decimal.
- Transaction arrays are sorted by string `date` using `localeCompare`.
- Expected date format is `YYYY-MM-DD`, but normal portfolio API does not strictly validate it.
- Asset current price comes from global `assets` input, not from transaction price.
- Fees, taxes, dividends, splits and FX conversion are not modeled.

## Holdings In `calculatePortfolioPerformance()`

Implementation:

- `src/lib/portfolio-summary.ts`
- Internal helper: `applyTransactionToHoldings()`

Inputs:

- `portfolio.transactions`
- `assets` global list

Formula:

```text
For each sorted transaction:
  buy:
    quantity += transaction.quantity
    totalCost += quantity * transaction.price
    avgBuyPrice = totalCost / quantity

  sell:
    costToRemove = min(existing.quantity, sellQuantity) * avgBuyPrice
    quantity = max(0, existing.quantity - sellQuantity)
    totalCost = max(0, totalCost - costToRemove)
    avgBuyPrice = quantity ? totalCost / quantity : 0
```

Outputs:

- Open holdings only, filtered by `quantity > 0`.

Edge cases:

- Sell greater than current quantity is clamped to zero quantity and zero/minimized cost.
- Invalid/zero buy/sell quantity is ignored by calculation helper.
- The helper still records a holding entry for transactions with `assetId`, even if no valid quantity movement happens; it is later filtered out if quantity is not positive.

Potential issue:

- Oversells are not rejected in persistence and can affect realized P/L differently across summary and position analytics.
- Confidence: high.

## Holding Market Value

Implementation:

- `src/lib/portfolio-summary.ts`
- `calculatePortfolioPerformance()`

Formula:

```text
currentPrice = assetById.get(assetId)?.price ?? 0
marketValue = quantity * currentPrice
costBasis = quantity * avgBuyPrice
pnl = marketValue - costBasis
pnlPct = costBasis > 0 ? pnl / costBasis : 0
```

Currency:

- Displayed as USD by UI formatters.

Consumers:

- Home, portfolio dashboard cards, portfolio detail valuation, asset allocation.

Edge cases:

- Missing asset metadata or price gives current price `0`.
- Cost basis of `0` gives `pnlPct = 0`.

## Cash Balance

Implementation:

- `src/lib/portfolio-summary.ts`
- `calculatePortfolioPerformance()`

Condition:

- Applied only if `Boolean(portfolio.managesCash)` is true.

Formula:

```text
cashBalance starts at 0
cashNetContributions starts at 0

cash_in:
  cashBalance += price
  cashNetContributions += price

cash_out:
  cashBalance -= price
  cashNetContributions -= price

buy:
  cashBalance -= quantity * price
  cashNetContributions unchanged

sell:
  cashBalance += quantity * price
  cashNetContributions unchanged
```

Synthetic holding:

```text
assetId = cash:<portfolio.id>
symbol = USD
name = Efectivo
type = cash
quantity = cashBalance
avgBuyPrice = 1
currentPrice = 1
marketValue = cashBalance
costBasis = cashBalance
pnl = 0
pnlPct = 0
```

Consumers:

- Portfolio total value.
- Asset type breakdown.
- Chart values.

Edge cases:

- Tiny balances with absolute value below `1e-8` become `0`.
- Negative cash remains negative and is included in total market value.
- Cash transactions in non-cash portfolios are ignored by calculations.

Note:

- Cash is displayed as the first open position in `PortfolioV3MainClient` when `managesCash=true` (see Open Position Analytics below). Closed analytics still exclude cash.

## Portfolio Total Market Value

Implementation:

- `src/lib/portfolio-summary.ts`

Formula:

```text
totalMarketValue = sum(holdingsList.marketValue)
```

If `managesCash=true`, `holdingsList` includes synthetic cash, so total market value includes cash.

Consumers:

- `getPortfolioSummary()`
- Home totals.
- Portfolio valuation cards.

## Portfolio Total Cost Basis

Implementation:

- `src/lib/portfolio-summary.ts`

Formula:

```text
if managesCash:
  totalCostBasis = cashNetContributions
else:
  totalCostBasis = sum(openHolding.costBasis)
```

Impact:

- For cash-managed portfolios, return is measured against net cash contributions, not open cost basis.
- For non-cash portfolios, return is measured against current open positions only.

Potential issue:

- Realized gains/losses from sold positions are excluded from non-cash `totalCostBasis` and `totalPnl` because closed positions are filtered out of holdings.
- Confidence: medium-high, based on current formula.

## Portfolio P/L And Return

Implementation:

- `src/lib/portfolio-summary.ts`

Formula:

```text
totalPnl = totalMarketValue - totalCostBasis
totalPnlPct = totalCostBasis > 0 ? totalPnl / totalCostBasis : 0
```

Consumers:

- Home global summary.
- Portfolio list cards.
- Portfolio detail header.

Edge cases:

- If `totalCostBasis <= 0`, percentage return is `0`.
- Cash-managed portfolio with negative net contributions can show `0` percent return.

## Asset Type Breakdown

Implementation:

- `src/lib/portfolio-summary.ts`

Formula:

```text
group holdingsList by item.type
sum marketValue per type
sort descending by marketValue
```

Consumers:

- Home "Activos por portfolio".

Edge cases:

- Includes synthetic cash if `managesCash=true`.

## Chart Points

Implementation:

- `src/lib/portfolio-summary.ts`

Formula:

```text
chartPoints starts [{ label: "Inicio", value: 0 }]
For each transaction date:
  apply transactions up to that date to chart holdings
  apply cash movements if managesCash
  value = sum(current quantity * current global asset price) + cash if managesCash
append { label: date, value }
append { label: "Hoy", value: totalMarketValue }
```

Important:

- Historical chart values use current asset prices, not historical prices.

Potential issue:

- The chart is not a historical market value chart; it is current-price valuation of historical quantities.
- Confidence: high.

## Open Position Analytics

Implementation:

- `src/lib/portfolio-positions.ts`
- `buildPortfolioPositionsAnalytics()`

Formula:

```text
marketValue = remaining quantity * current global asset price
investedValue = remaining quantity * avgBuyPrice
pnl = marketValue - investedValue
pnlPct = investedValue > 1e-8 ? pnl / investedValue : 0
sharePct = marketValue / totalOpenMarketValue
```

Consumers:

- Portfolio open positions list.
- Open asset detail page.

Cash position:

- When `portfolio.managesCash` is true, a synthetic `cash` open position is prepended first, using the same balance source as the summary (`calculateCashTotals()` in `src/lib/portfolio-summary.ts`).
- Fields mirror the summary synthetic holding: `assetId = cash:<portfolio.id>`, `symbol = USD`, `name = Efectivo`, `type = cash`, `avgBuyPrice = 1`, `currentPrice = 1`, `marketValue = investedValue = cashBalance`, `pnl = 0`, `pnlPct = 0`.
- It is included in `totalOpenMarketValue`, so `sharePct` of every open position is measured against value including cash.
- `PortfolioV3MainClient` renders it first as a non-clickable card with a fixed green dot (`#10b981`); cash has no asset detail page.

Edge cases:

- `cash_in`/`cash_out` transactions never create buy/sell accumulators; they only feed the synthetic cash position.
- Missing global asset price gives `0`.
- `sharePct` includes cash when `managesCash=true`.

## Closed Position Analytics

Implementation:

- `src/lib/portfolio-positions.ts`

Formula:

```text
For sells:
  sellQty = min(current quantity, transaction quantity)
  costToRemove = sellQty * avgBuyPrice
  proceeds = transaction quantity * transaction price
  realizedCost += costToRemove
  realizedPnl += proceeds - costToRemove

Closed position emitted when:
  remaining quantity <= 1e-8
  totalBoughtQty > 1e-8
  totalSoldQty > 1e-8

investedCapital = realizedCost
realizedPnlPct = investedCapital > 1e-8 ? realizedPnl / investedCapital : 0
avgBuyPrice = totalBoughtAmount / totalBoughtQty
avgSellPrice = totalSoldAmount / totalSoldQty
closedAt = lastSellDate || lastBuyDate
```

Consumers:

- Closed positions tab.
- Closed detail page.

Potential issue:

- If sold quantity exceeds held quantity, `proceeds` uses full sold quantity while `costToRemove` uses clamped quantity. This can overstate realized P/L for oversells.
- Confidence: high.

## Transaction Amount Display

Implementation:

- `src/components/PortfolioTransactionsTable.tsx`

Formula:

```text
cash transaction total = transaction.price
asset transaction total = transaction.price * transaction.quantity
```

Consumers:

- Transaction table "Total" column.

## Global Home Totals

Implementation:

- `src/app/page.tsx`

Formula:

```text
portfolioPerformances = portfolios.map(calculatePortfolioPerformance)
totalMarketValue = sum(performance.totalMarketValue)
totalCostBasis = sum(performance.totalCostBasis)
totalPnl = totalMarketValue - totalCostBasis
totalPnlPct = totalCostBasis > 0 ? totalPnl / totalCostBasis : 0
```

Consumers:

- Home page cards and rankings.

