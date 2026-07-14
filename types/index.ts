export type AccountCategory = 'retirement' | 'taxable' | 'insurance' | 'liquidity'

export type Account = {
  id: string
  user_id: string
  code: string
  name: string
  type: string
  balance: number
  category: AccountCategory
  created_at: string
}

export type Holding = {
  id: string
  user_id: string
  account_id: string | null
  ticker: string
  name: string
  shares: number
  cost_basis: number
  current_value: number
  prior_close: number
  annual_dividends: number
  yield_on_cost: number
  drip: boolean
  created_at: string
}

export type PropertyType = 'primary' | 'secondary' | 'vacation' | 'rental'

export type Property = {
  id: string
  user_id: string
  name: string
  type: PropertyType
  value: number
  mortgage_balance: number
  monthly_rent: number
  monthly_expenses: number
  monthly_pi: number
  cash_invested: number
  created_at: string
}

export type DebtCategory = 'mortgage' | 'credit_card' | 'auto' | 'student' | 'margin' | 'policy_loan' | 'other'

export type Debt = {
  id: string
  user_id: string
  name: string
  type: string        // free-text description (e.g. "30yr fixed")
  category: DebtCategory  // structured category for mortgage detection
  balance: number
  interest_rate: number
  created_at: string
}

export type Goal = {
  id: string
  user_id: string
  name: string
  description: string | null
  target: number
  current: number
  is_complete: boolean
  created_at: string
}

export type FireSettings = {
  id: string
  user_id: string
  invested: number
  annual_contribution: number
  expected_return: number
  annual_spending: number        // retirement annual spending (4% rule target)
  current_age: number
  monthly_expenses: number       // current monthly expenses (freedom score denominator)
  target_retirement_age: number  // Coast FIRE compounding target age
  updated_at: string
}

export type PortfolioSnapshot = {
  user_id: string
  snapshot_date: string  // 'YYYY-MM-DD'
  net_worth: number
  invested_assets: number
  retirement_total: number
  taxable_total: number
  real_estate_equity: number
  consumer_debt: number
  passive_annual: number
  dividend_income_annual: number
  rental_cash_flow_monthly: number
  insurance_total: number
  liquidity_total: number
  freedom_score: number
}

// ── Insert types (omit server-generated fields) ──
export type AccountInsert = Omit<Account, 'id' | 'user_id' | 'created_at'>
export type HoldingInsert = Omit<Holding, 'id' | 'user_id' | 'created_at'>
export type PropertyInsert = Omit<Property, 'id' | 'user_id' | 'created_at'>
export type DebtInsert = Omit<Debt, 'id' | 'user_id' | 'created_at'>
export type GoalInsert = Omit<Goal, 'id' | 'user_id' | 'created_at'>
export type FireSettingsInsert = Omit<FireSettings, 'id' | 'user_id' | 'updated_at'>
