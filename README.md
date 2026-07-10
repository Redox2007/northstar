# Northstar — Personal Financial Freedom Tracker

Northstar is a private, self-hosted financial dashboard built for tracking progress toward FIRE (Financial Independence, Retire Early). It connects all your financial buckets — investment accounts, real estate, dividends, and debt — into a single freedom score.

---

## Features

- **Dashboard** — Freedom score, net worth, passive income progress, Coast FIRE status, and "where your money lives" breakdown
- **Accounts** — Track retirement (401k, IRA, HSA), taxable, insurance/IUL, and liquidity accounts with real estate equity alongside them
- **Dividend Tracker** — Per-holding cost basis, market value, annual income, DRIP toggle, and account linking to prevent double-counting
- **Real Estate** — Multi-property tracking with property types (Primary, Secondary, Vacation, Rental). Cash flow and cash-on-cash return calculated for rentals only
- **Debt Tracker** — Avalanche-sorted debt list with explicit categories (mortgage, credit card, auto, etc.) so mortgage debt is never double-counted in net worth
- **FIRE Calculator** — Interactive scenario modeler with Coast FIRE, Traditional FIRE, and Cash-Flow FIRE targets. Configurable target retirement age
- **Goals** — Six milestone cards tracking invested assets, net worth, passive income, salary replacement, and freedom score

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + custom CSS variables |
| Charts | Recharts |
| Database | Supabase (Postgres + Row Level Security) |
| Auth | Supabase Auth (email/password) |
| Deployment | Vercel |

---

## Architecture

All financial calculations flow through a single **Financial Engine** (`lib/financial-engine.ts`). Every page fetches raw DB rows and passes them to `computeFinancials()` — no page calculates net worth, passive income, or FIRE numbers independently. This ensures all numbers are consistent across the app.

Key design decisions:

- **Holdings are per-share** — `cost_basis`, `current_value`, and `annual_dividends` are stored per share; totals are computed as `shares × per_share_value`
- **Account linking** — Holdings can be linked to a brokerage account. When linked, the account's cash balance is excluded from totals (holdings market value is the source of truth), preventing double-counting
- **Holdings bucketed by account category** — A holding linked to a 401(k) account contributes to `retirementTotal`, not `taxableTotal`
- **Mortgage exclusion** — Real estate equity is `property value − mortgage_balance`. Net worth only subtracts consumer debt (non-mortgage) to avoid counting mortgages twice
- **Rental-only cash flow** — Only properties with `type = 'rental'` contribute to passive income. Primary homes, vacation properties, etc. are excluded from cash flow

---

## Local Setup

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)

### 1. Clone the repo

```bash
git clone https://github.com/Redox2007/northstar.git
cd northstar
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a new project, and note your **Project URL** and **anon public key** from Settings → API.

### 3. Run migrations

In the Supabase dashboard, open **SQL Editor** and run each migration file in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_fire_settings.sql
supabase/migrations/003_property_type.sql
supabase/migrations/004_holdings_account_link.sql
supabase/migrations/005_debt_category.sql
supabase/migrations/006_fire_retirement_age.sql
```

### 4. Configure environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create an account.

---

## Deployment (Vercel)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
3. Add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings
4. Click **Deploy**

Vercel auto-deploys on every push to `main`.

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `accounts` | Financial accounts (retirement, taxable, insurance, liquidity) |
| `holdings` | Individual stock/ETF positions with optional account link |
| `properties` | Real estate with mortgage balance, rent, and expenses |
| `debts` | Debts with explicit category for mortgage detection |
| `fire_settings` | FIRE calculator assumptions per user |
| `goals` | Custom milestone tracking (reserved for future use) |

All tables have Row Level Security enabled — users can only read and write their own data.

---

## Known Limitations / Roadmap

- **Mortgage in two places** — `Property.mortgage_balance` and a matching `Debt` record can get out of sync. Future: link properties to debt records via `mortgage_debt_id`
- **`current_value` naming** — This field stores price per share, but the name implies a total. Future: rename to `current_price` with a DB migration
- **No market data sync** — Prices and dividends must be updated manually. Future: integrate a market data API
- **Single currency** — All values assumed to be USD

---

## Contributing

This is a personal project. Feel free to fork and adapt it for your own financial tracking.

---

## License

MIT
