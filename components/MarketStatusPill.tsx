import { createClient } from '@/lib/supabase/server'

/**
 * Server component — fetches the latest market refresh run and renders
 * the status pill. Replaces the hardcoded "All accounts synced" pill.
 *
 * States:
 *   Current  → "Market prices updated · Jul 10, 9:05 PM · 9 of 9"
 *   Partial  → "Prices partially updated · 8 of 9 securities"  (amber)
 *   Stale    → "Market prices last updated 2d ago"              (red-ish)
 *   Never    → "Prices not yet refreshed"                       (muted)
 */
export async function MarketStatusPill() {
  const supabase = await createClient()

  const { data: run } = await supabase
    .from('market_refresh_runs')
    .select('status, completed_at, symbols_requested, symbols_updated, failed_symbols')
    .in('status', ['success', 'partial'])
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Never refreshed
  if (!run?.completed_at) {
    return (
      <div className="pill" style={{ color: '#9a8a78' }}>
        ● Prices not yet refreshed
      </div>
    )
  }

  const completedAt = new Date(run.completed_at)
  const now         = new Date()
  const hoursSince  = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60)

  const timeStr = completedAt.toLocaleString('en-US', {
    month:   'short',
    day:     'numeric',
    hour:    'numeric',
    minute:  '2-digit',
    hour12:  true,
  })

  // Stale: not refreshed in >30 hours (missed a nightly run)
  if (hoursSince > 30) {
    const daysAgo = Math.round(hoursSince / 24)
    return (
      <div className="pill" style={{ color: '#b0552f' }}>
        ● Market prices last updated {daysAgo}d ago
      </div>
    )
  }

  // Partial: some tickers failed
  if (run.status === 'partial') {
    return (
      <div className="pill" style={{ color: '#b0772f' }}>
        ● Prices partially updated · {run.symbols_updated} of {run.symbols_requested} securities
      </div>
    )
  }

  // Current / success
  return (
    <div className="pill">
      ● Market prices updated · {timeStr} · {run.symbols_updated} of {run.symbols_requested} securities
    </div>
  )
}
