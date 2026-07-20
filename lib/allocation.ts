import { Account, Holding } from '@/types'

export type AllocationBucketKey = 'us_stock' | 'international_stock' | 'bond' | 'cash' | 'real_estate' | 'insurance'
export interface AllocationBucket { key: AllocationBucketKey; label: string; value: number; pct: number }

function classBucket(assetClass: string): 'us_stock' | 'international_stock' | 'bond' | 'cash' {
  if (assetClass === 'international_stock') return 'international_stock'
  if (assetClass === 'bond') return 'bond'
  if (assetClass === 'us_stock') return 'us_stock'
  return 'cash' // 'cash' | 'other' | unrecognized fold into Cash
}

export function computeAllocation(
  accounts: Account[], holdings: Holding[], reEquity: number, insuranceTotal: number
): { buckets: AllocationBucket[]; grossAssets: number } {
  const accountById = new Map(accounts.map(a => [a.id, a]))
  const linkedAccountIds = new Set(holdings.map(h => h.account_id).filter(Boolean))

  // Holdings bucketed by asset_class regardless of linked account, EXCEPT holdings
  // linked to an insurance-category account — their value is already counted in
  // insuranceTotal (financial engine's tax-treatment bucketing); including them
  // here too would double-count.
  const holdingTotals = holdings.reduce<Record<string, number>>((acc, h) => {
    const linkedAccount = h.account_id ? accountById.get(h.account_id) : undefined
    if (linkedAccount?.category === 'insurance') return acc
    const cls = classBucket(h.asset_class)
    acc[cls] = (acc[cls] ?? 0) + (h.shares ?? 0) * (h.current_value ?? 0)
    return acc
  }, {})

  // Unlinked retirement/taxable/liquidity balances have no per-security detail —
  // bucket as Cash (composition, e.g. a target-date fund, is unknown).
  const unexplainedCash = accounts
    .filter(a => a.category !== 'insurance' && !linkedAccountIds.has(a.id))
    .reduce((s, a) => s + (a.balance ?? 0), 0)

  const usStock = holdingTotals.us_stock ?? 0
  const intl    = holdingTotals.international_stock ?? 0
  const bond    = holdingTotals.bond ?? 0
  const cash    = (holdingTotals.cash ?? 0) + unexplainedCash

  const grossAssets = usStock + intl + bond + cash + reEquity + insuranceTotal
  const pct = (v: number) => grossAssets > 0 ? Math.round(v / grossAssets * 100) : 0

  return {
    grossAssets,
    buckets: [
      { key: 'us_stock',            label: 'US Stocks',       value: usStock,        pct: pct(usStock) },
      { key: 'international_stock', label: 'International',   value: intl,           pct: pct(intl) },
      { key: 'bond',                label: 'Bonds',           value: bond,           pct: pct(bond) },
      { key: 'cash',                label: 'Cash',            value: cash,           pct: pct(cash) },
      { key: 'real_estate',         label: 'Real Estate',     value: reEquity,       pct: pct(reEquity) },
      { key: 'insurance',           label: 'Insurance / IUL', value: insuranceTotal, pct: pct(insuranceTotal) },
    ],
  }
}
