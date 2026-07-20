type Props = {
  userName: string
  hasPortfolioHistory: boolean
  todayChange: number | null
  portfolioPct: number | null
  winner: { ticker: string; pct: number } | null
  loser: { ticker: string; pct: number } | null
  coastPct: number
}

function fmt(n: number) {
  const neg = n < 0
  return (neg ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US')
}

export default function MarketSummary({ userName, hasPortfolioHistory, todayChange, portfolioPct, winner, loser, coastPct }: Props) {
  if (!hasPortfolioHistory) {
    return (
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="cardtitle" style={{ marginBottom: 8 }}>Good morning, {userName}</div>
        <p className="subtle">Still gathering your first day-over-day comparison — check back tomorrow morning.</p>
      </div>
    )
  }

  const sameTicker = winner && loser && winner.ticker === loser.ticker

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="cardtitle" style={{ marginBottom: 12 }}>Good morning, {userName}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 22px', fontSize: 13.5 }}>
        {todayChange !== null && (
          <span>Net worth: <b className={todayChange >= 0 ? 'grn' : 'acc'}>{todayChange >= 0 ? '+' : '−'}{fmt(Math.abs(todayChange))}</b> yesterday</span>
        )}
        {portfolioPct !== null && (
          <span>Portfolio: <b className={portfolioPct >= 0 ? 'grn' : 'acc'}>{portfolioPct >= 0 ? '+' : ''}{portfolioPct.toFixed(2)}%</b></span>
        )}
        {winner && loser && !sameTicker && (
          <>
            <span>Largest winner: <b className="grn">{winner.ticker} +{winner.pct.toFixed(2)}%</b></span>
            <span>Largest loser: <b className="acc">{loser.ticker} {loser.pct.toFixed(2)}%</b></span>
          </>
        )}
        {sameTicker && (
          <span>Biggest mover: <b className={winner!.pct >= 0 ? 'grn' : 'acc'}>{winner!.ticker} {winner!.pct >= 0 ? '+' : ''}{winner!.pct.toFixed(2)}%</b></span>
        )}
        {!winner && !loser && (
          <span className="subtle">Price history is still building — winners and losers will show up after tomorrow&apos;s update.</span>
        )}
        <span>You&apos;re still <b className="acc">{coastPct}%</b> of the way to Coast FIRE</span>
      </div>
    </div>
  )
}
