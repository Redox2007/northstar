# Northstar Roadmap

Status so far: **Phase 1** (core tracking), **Phase 2a** (automated market
data refresh via Twelve Data + nightly cron), and **Phase 2b** (historical
dashboard charts backed by `portfolio_snapshots`) are shipped. This document
captures the next phases, gathered from a product feedback review, to
implement going forward.

---

## Phase 3 — Intelligence

The app knows your numbers. Now it should start explaining them.

### 1. Net Worth Attribution ⭐⭐⭐⭐⭐
Instead of just "Net Worth −$1,536", break down *why*:

```
Today's Change

Stocks
  FXAIX   -$1,142
  CHPY      -$183
  SCHD       +$11

Real Estate
  No change

Debt
  No change

Cash
  +$300

Total
-$1,536
```
Answers "why did my net worth move?" per holding/bucket, not just the total.

### 2. Daily Market Summary ⭐⭐⭐⭐⭐
A morning digest:
```
Good morning, Mani.

Yesterday:
  Net Worth         -$1,536
  Portfolio         -0.74%
  Largest Winner    SCHD +1.8%
  Largest Loser     FXAIX -1.2%
  Dividend Received $21

You're still 82% to Coast FIRE.
```
The kind of thing that makes someone open the app every morning.

### 3. Asset Allocation
Percent breakdown instead of raw balances:
```
US Stocks       61%
International    7%
Real Estate     28%
Cash             2%
Insurance        1%
```
Compare against a configurable target allocation.

### 4. Goal Forecasts
Instead of "$300k invested — 69%", forecast *when*:
```
Expected:    October 2027
Likely:      January 2028
Aggressive:  July 2027
```

---

## Phase 4 — Portfolio Intelligence

Where Northstar starts feeling like a wealth manager.

### Dividend Calendar ⭐⭐⭐⭐⭐
Monthly received-dividend totals, plus next expected payments:
```
January   $318
February  $302
March     $427
...

Expected Next Payment
  July 28
    FXAIX  $164
    SCHD    $21
```

### Dividend Growth
```
2025           $8,200
2026          $12,700
2027 (proj.)  $18,600
```

### Rebalancing
Target vs. current allocation, with suggested trades:
```
              Target   Current
US Growth       40%       48%
Income          20%       14%
International   10%        4%
Real Estate     30%       34%
```

### Tax Optimization
Suggest which holdings are better held in which account type:
```
FXAIX  → better in 401(k)
SCHD   → move to taxable
CHPY   → hold in Roth
```

---

## Phase 5 — Real Estate OS

Most finance apps focus on stocks; almost none unify stocks and rentals
well. This is where Northstar can differentiate.

### Property Timeline
```
Bought        2025, $132k
Current       $186k
Gain          +$54k
Mortgage Paid $4,900
Total Return  $58,900
```

### Equity Growth
Year-over-year projection including appreciation + principal paydown:
```
2026  $165k
2027  $189k
2028  $215k
```

### BRRR Tracker
Track: Purchase, Rehab, ARV, Cash Recovered, Remaining Equity, Cash-on-Cash.

### Deal Analyzer
Paste a Zillow/Crexi link; Northstar computes Cap rate, CoC, DSCR, NOI,
BRRR viability, IRR estimate — bringing the "analyze deals in ChatGPT"
workflow natively into the app.

---

## Phase 6 — Automation

Remove manual data entry.

- **Broker Sync** — Robinhood, Fidelity, Schwab, Interactive Brokers (no more manually entering shares)
- **Property Value Updates** — monthly Zillow/HouseCanary/RentCast estimate
- **Mortgage Balance Updates** — monthly principal reduction, automated
- **Auto Dividends** — replace the single `annual_dividends` field with real per-payment records (Payment amount, Ex-date, Pay-date), populated automatically instead of stored as one annualized number

---

## Phase 7 — AI Financial Advisor

Because the Financial Engine (`lib/financial-engine.ts`) already computes
everything from a single set of inputs, an AI layer on top can just modify
those inputs and rerun `computeFinancials()` — no duplicated logic. Target
questions:

- "Can I retire at 55?"
- "What if I increase SCHD by $500/month?"
- "What if I buy another rental?"
- "What if I sell CHPY?"
- "Can I afford a Tesla?"
- "How much passive income will I have in 2032?"

---

## Bonus idea: Financial Timeline

A GitHub-contribution-graph-style scroll through your financial life —
narrative, not just charts:
```
2025
  ✓ Bought first rental
  ✓ Crossed $100k invested
  ✓ First $1,000/month passive income
  ✓ Coast FIRE achieved

2026
  ✓ Bought second rental
  ✓ Portfolio reached $250k
  ✓ Mortgage balance below $300k

2027
  ✓ $500k invested
  ✓ Salary replaced by passive income
```
Unlike charts, this gives progress a narrative — a personal history of the
wealth-building journey, distinct from any single metric trend. (Feeds
naturally off the same `portfolio_snapshots` + milestone-history data
already built in Phase 2b — new milestone types would just need dated
thresholds the same way `$300k invested` / `$500k invested` / `$1M net
worth` already work today.)

---

## Suggested sequencing (next ~3 months)

**Release 3.0 — Intelligence**
- Net worth attribution
- Asset allocation
- Daily market summary
- Forecasted goal completion

**Release 3.5 — Portfolio**
- Dividend calendar
- Rebalancing
- Dividend growth history
- Tax-location insights

**Release 4.0 — Real Estate**
- Deal analyzer
- BRRR tracker
- Equity growth projections
- Property timeline
