/**
 * Financial Engine — single source of truth for all derived metrics.
 * Every page fetches raw DB rows and passes them here; no page computes
 * net worth, passive income, or FIRE numbers on its own.
 */

import { Account, Holding, Property, Debt, FireSettings } from '@/types'

export interface EngineInput {
  accounts:   Account[]
  holdings:   Holding[]
  properties: Property[]
  debts:      Debt[]
  fire:       FireSettings | null
}

export interface EngineOutput {
  // ── Account buckets ──
  // Each bucket = unlinked account balances + holdings whose linked account is in that category
  retirementTotal:  number
  taxableTotal:     number
  insuranceTotal:   number
  liquidityTotal:   number
  portValue:        number   // total holdings market value across all categories
  holdingsByCategory: Record<string, number>  // for per-bucket display in accounts page

  // ── Real estate ──
  reEquity:   number   // sum(value − mortgage_balance)
  rentalCF:   number   // monthly net cash flow (rentals only, can be negative)
  reCashIn:   number   // total cash invested in rentals
  reCoC:      number   // cash-on-cash return (%)

  // ── Debt ──
  totalDebt:    number
  mortgageDebt: number
  consumerDebt: number   // totalDebt − mortgageDebt (used in net worth)

  // ── Net worth ──
  netWorth:      number   // retirement + taxable + reEquity + insurance + liquidity − consumerDebt
  totalInvested: number   // retirement + taxable (investable assets for FIRE)

  // ── Passive income ──
  divIncome:      number   // annual dividend income
  passiveMonthly: number   // divMonthly + rentalCF (full, can be negative)
  passiveAnnual:  number

  // ── Freedom score ──
  freedomScore:    number   // clamped 0–100
  monthlyExpenses: number   // current monthly expenses (for freedom score)

  // ── FIRE numbers ──
  fiNumber:            number   // annualSpending × 25 (4% rule)
  coastNumber:         number   // fiNumber / (1+r)^yearsToRetirement
  coastPct:            number   // 0–100
  coastDone:           boolean
  targetRetirementAge: number
  yearsToRetirement:   number
}

export function computeFinancials({ accounts, holdings, properties, debts, fire }: EngineInput): EngineOutput {
  const monthlyExpenses       = fire?.monthly_expenses       ?? 5000
  const annualSpending        = fire?.annual_spending        ?? 60000
  const expectedReturn        = fire?.expected_return        ?? 0.07
  const currentAge            = fire?.current_age            ?? 39
  const targetRetirementAge   = fire?.target_retirement_age  ?? 65

  // ── Account buckets ──
  // Holdings are assigned to the same category as their linked account.
  // Accounts that are linked to holdings are excluded from the account total
  // (holdings market value is the source of truth for those accounts).

  const accountById     = new Map(accounts.map(a => [a.id, a]))
  const linkedAccountIds = new Set(holdings.map(h => h.account_id).filter(Boolean))

  const unlinkedAccountTotal = (cat: string): number =>
    accounts
      .filter(a => (a.category ?? 'liquidity') === cat && !linkedAccountIds.has(a.id))
      .reduce((s, a) => s + (a.balance ?? 0), 0)

  // Group each holding's market value into the category of its linked account.
  // Unlinked holdings fall into 'taxable' (most common for standalone brokerage positions).
  const holdingsByCategory = holdings.reduce<Record<string, number>>((totals, h) => {
    const linkedAccount = h.account_id ? accountById.get(h.account_id) : undefined
    const category = linkedAccount?.category ?? 'taxable'
    const value    = (h.shares ?? 0) * (h.current_value ?? 0)
    totals[category] = (totals[category] ?? 0) + value
    return totals
  }, {})

  const retirementTotal = unlinkedAccountTotal('retirement') + (holdingsByCategory.retirement ?? 0)
  const taxableTotal    = unlinkedAccountTotal('taxable')    + (holdingsByCategory.taxable    ?? 0)
  const insuranceTotal  = unlinkedAccountTotal('insurance')  + (holdingsByCategory.insurance  ?? 0)
  const liquidityTotal  = unlinkedAccountTotal('liquidity')  + (holdingsByCategory.liquidity  ?? 0)
  const portValue       = Object.values(holdingsByCategory).reduce((s, v) => s + v, 0)

  // ── Real estate ──
  const rentalProps = properties.filter(p => (p.type ?? 'rental') === 'rental')
  const reEquity    = properties.reduce((s, p) => s + (p.value - p.mortgage_balance), 0)
  const rentalCF    = rentalProps.reduce((s, p) => s + (p.monthly_rent - p.monthly_expenses - p.monthly_pi), 0)
  const reCashIn    = rentalProps.reduce((s, p) => s + (p.cash_invested ?? 0), 0)
  const reCoC       = reCashIn > 0 ? (rentalCF * 12) / reCashIn * 100 : 0

  // ── Debt ──
  // Use explicit category field ('mortgage') rather than fragile text matching.
  // Falls back to regex on the type field for records created before migration 005.
  const totalDebt    = debts.reduce((s, d) => s + d.balance, 0)
  const mortgageDebt = debts
    .filter(d => d.category === 'mortgage' || /mortgage|home loan|heloc/i.test(d.type ?? ''))
    .reduce((s, d) => s + d.balance, 0)
  const consumerDebt = totalDebt - mortgageDebt

  // ── Net worth ──
  // reEquity already nets out mortgage balances (value − mortgage_balance),
  // so we only subtract consumer debt to avoid double-counting.
  const netWorth      = retirementTotal + taxableTotal + reEquity + insuranceTotal + liquidityTotal - consumerDebt
  const totalInvested = retirementTotal + taxableTotal

  // ── Passive income ──
  // rentalCF is included at full value (positive or negative).
  // A cash-flow-negative rental genuinely reduces available passive income.
  const divIncome      = holdings.reduce((s, h) => s + (h.shares ?? 0) * (h.annual_dividends ?? 0), 0)
  const divMonthly     = Number.isFinite(divIncome / 12) ? divIncome / 12 : 0
  const passiveMonthly = divMonthly + rentalCF   // includes negative CF
  const passiveAnnual  = passiveMonthly * 12

  // ── Freedom score (clamped 0–100) ──
  const freedomScore = Math.max(0, Math.min(100,
    Math.round(passiveMonthly / Math.max(monthlyExpenses, 1) * 100)
  ))

  // ── FIRE numbers ──
  // yearsToRetirement uses Math.max(0,...) — a 65-year-old has 0 compounding years,
  // not 1. coastNumber equals fiNumber when already at or past retirement age.
  const fiNumber           = annualSpending * 25
  const yearsToRetirement  = Math.max(0, targetRetirementAge - currentAge)
  const coastNumber        = yearsToRetirement === 0
    ? fiNumber
    : fiNumber / Math.pow(1 + expectedReturn, yearsToRetirement)
  const coastPct  = Math.min(100, Math.round(totalInvested / coastNumber * 100))
  const coastDone = totalInvested >= coastNumber

  return {
    retirementTotal, taxableTotal, insuranceTotal, liquidityTotal,
    portValue, holdingsByCategory,
    reEquity, rentalCF, reCashIn, reCoC,
    totalDebt, mortgageDebt, consumerDebt,
    netWorth, totalInvested,
    divIncome, passiveMonthly, passiveAnnual,
    freedomScore, monthlyExpenses,
    fiNumber, coastNumber, coastPct, coastDone,
    targetRetirementAge, yearsToRetirement,
  }
}
