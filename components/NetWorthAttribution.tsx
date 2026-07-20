import { Holding, PortfolioSnapshot } from '@/types'

function fmt(n: number) {
  const neg = n < 0
  return (neg ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US')
}

type Props = { holdings: Holding[]; latestSnap: PortfolioSnapshot; previousSnap: PortfolioSnapshot }

export default function NetWorthAttribution({ holdings, latestSnap, previousSnap }: Props) {
  const stocksChange  = latestSnap.invested_assets    - previousSnap.invested_assets
  const reChange      = latestSnap.real_estate_equity - previousSnap.real_estate_equity
  const debtChange    = -(latestSnap.consumer_debt    - previousSnap.consumer_debt)
  const cashInsChange = (latestSnap.insurance_total - previousSnap.insurance_total)
                      + (latestSnap.liquidity_total  - previousSnap.liquidity_total)

  const buckets = [
    { label: 'Stocks & Funds',   value: stocksChange },
    { label: 'Real Estate',      value: reChange },
    { label: 'Cash & Insurance', value: cashInsChange },
    { label: 'Debt',             value: debtChange },
  ]

  const trackedHoldings = holdings.filter(h => h.prior_close > 0)
  const untrackedCount  = holdings.length - trackedHoldings.length
  const perTicker = trackedHoldings
    .map(h => ({ ticker: h.ticker, change: h.shares * (h.current_value - h.prior_close) }))
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))

  return (
    <div className="card">
      <div className="cardtitle" style={{ marginBottom: 16 }}>Today&apos;s change</div>
      <div className="grid4" style={{ gap: 14, marginBottom: perTicker.length ? 18 : 0 }}>
        {buckets.map(b => (
          <div key={b.label}>
            <div className="klabel">{b.label}</div>
            <div className={b.value >= 0 ? 'grn' : 'acc'} style={{ fontWeight: 700, fontSize: 18, marginTop: 4 }}>
              {b.value >= 0 ? '+' : '−'}{fmt(Math.abs(b.value))}
            </div>
          </div>
        ))}
      </div>
      {perTicker.length > 0 && (
        <div style={{ borderTop: '1px solid #f1e7d8', paddingTop: 14 }}>
          <div className="klabel" style={{ marginBottom: 10 }}>By holding</div>
          {perTicker.map(p => (
            <div key={p.ticker} className="rowbtwn" style={{ padding: '5px 0' }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{p.ticker}</span>
              <span className={p.change >= 0 ? 'grn' : 'acc'} style={{ fontWeight: 600, fontSize: 13 }}>
                {p.change >= 0 ? '+' : '−'}{fmt(Math.abs(p.change))}
              </span>
            </div>
          ))}
          {untrackedCount > 0 && (
            <p className="subtle" style={{ marginTop: 8 }}>
              {untrackedCount} holding{untrackedCount === 1 ? '' : 's'} not shown yet — needs one more nightly price update before its daily change can be calculated.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
