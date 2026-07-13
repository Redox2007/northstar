/**
 * Nightly market data refresh cron job.
 * Triggered by Vercel cron at 02:00 UTC (9 PM EST / 10 PM EDT).
 * Can also be triggered manually: GET /api/cron/refresh-market-data?secret=YOUR_CRON_SECRET
 *
 * Flow:
 *   Authorize → create refresh-log row → fetch tickers → FMP batch quotes
 *   → validate & update prices → reload data → computeFinancials
 *   → upsert daily snapshot → mark log success/partial/failed
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchBatchQuotes } from '@/lib/market-data/fmp'
import { computeFinancials } from '@/lib/financial-engine'
import { Account, Holding, Property, Debt, FireSettings } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60   // Vercel Pro: up to 300s; Hobby: up to 60s

export async function GET(request: NextRequest) {
  // ── 1. Authorize ──────────────────────────────────────────────────────────
  // Vercel cron sends: Authorization: Bearer <CRON_SECRET>
  // Manual trigger:    ?secret=<CRON_SECRET>
  const authHeader = request.headers.get('authorization')
  const querySecret = new URL(request.url).searchParams.get('secret')
  const cronSecret  = process.env.CRON_SECRET

  const authorized =
    authHeader === `Bearer ${cronSecret}` ||
    (querySecret && querySecret === cronSecret)

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const apiKey   = process.env.FMP_API_KEY!

  // ── 2. Create refresh-log row ─────────────────────────────────────────────
  const { data: runRow, error: runErr } = await supabase
    .from('market_refresh_runs')
    .insert({ status: 'running', symbols_requested: 0, symbols_updated: 0 })
    .select('id')
    .single()

  if (runErr || !runRow) {
    console.error('Failed to create refresh run log:', runErr)
    return NextResponse.json({ error: 'Failed to create run log' }, { status: 500 })
  }

  const runId = runRow.id

  try {
    // ── 3. Get all distinct user IDs from holdings ──────────────────────────
    const { data: userRows } = await supabase
      .from('holdings')
      .select('user_id')

    const userIds = [...new Set(
      (userRows ?? []).map((r: { user_id: string }) => r.user_id).filter(Boolean)
    )]

    // ── 4. Collect all unique tickers across all users ──────────────────────
    const { data: allHoldings } = await supabase
      .from('holdings')
      .select('ticker')

    const allTickers = [...new Set(
      (allHoldings ?? [])
        .map((h: { ticker: string | null }) => h.ticker?.toUpperCase())
        .filter((t): t is string => !!t)
    )]

    // ── 5. Batch fetch quotes from FMP (one request for all tickers) ─────────
    let quotes: { ticker: string; price: number }[] = []
    try {
      quotes = await fetchBatchQuotes(allTickers, apiKey)
    } catch (fetchErr) {
      await supabase.from('market_refresh_runs').update({
        completed_at:   new Date().toISOString(),
        status:         'failed',
        symbols_requested: allTickers.length,
        error_message:  fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
      }).eq('id', runId)
      return NextResponse.json({ error: 'FMP fetch failed', detail: String(fetchErr) }, { status: 502 })
    }

    const quoteMap = new Map(quotes.map(q => [q.ticker, q.price]))

    // Tickers FMP returned no valid price for
    const failedSymbols = allTickers.filter(t => !quoteMap.has(t))

    // ── 6. Update holdings prices ──────────────────────────────────────────
    const updatedAt = new Date().toISOString()
    let symbolsUpdated = 0

    for (const ticker of allTickers) {
      const price = quoteMap.get(ticker)
      if (!price) continue   // leave existing price untouched — never write 0 or null

      const { error: updateErr } = await supabase
        .from('holdings')
        .update({ current_value: price, price_updated_at: updatedAt })
        .eq('ticker', ticker)   // updates across all users who hold this ticker

      if (!updateErr) symbolsUpdated++
    }

    // ── 7. Compute financials & upsert snapshot for each user ───────────────
    const today = new Date().toISOString().split('T')[0]

    for (const userId of userIds) {
      const [
        { data: holdings },
        { data: accounts },
        { data: properties },
        { data: debts },
        { data: fireRow },
      ] = await Promise.all([
        supabase.from('holdings').select('*').eq('user_id', userId),
        supabase.from('accounts').select('*').eq('user_id', userId),
        supabase.from('properties').select('*').eq('user_id', userId),
        supabase.from('debts').select('*').eq('user_id', userId),
        supabase.from('fire_settings').select('*').eq('user_id', userId).single(),
      ])

      const e = computeFinancials({
        accounts:   (accounts   as Account[])   ?? [],
        holdings:   (holdings   as Holding[])   ?? [],
        properties: (properties as Property[])  ?? [],
        debts:      (debts      as Debt[])      ?? [],
        fire:       fireRow as FireSettings | null,
      })

      await supabase.from('portfolio_snapshots').upsert({
        user_id:                  userId,
        snapshot_date:            today,
        net_worth:                Math.round(e.netWorth),
        invested_assets:          Math.round(e.totalInvested),
        retirement_total:         Math.round(e.retirementTotal),
        taxable_total:            Math.round(e.taxableTotal),
        real_estate_equity:       Math.round(e.reEquity),
        consumer_debt:            Math.round(e.consumerDebt),
        passive_annual:           Math.round(e.passiveAnnual),
        dividend_income_annual:   Math.round(e.divIncome),
        rental_cash_flow_monthly: Math.round(e.rentalCF),
        insurance_total:          Math.round(e.insuranceTotal),
        liquidity_total:          Math.round(e.liquidityTotal),
        freedom_score:            e.freedomScore,
      }, { onConflict: 'user_id,snapshot_date' })
    }

    // ── 8. Mark refresh log complete ───────────────────────────────────────
    const finalStatus =
      symbolsUpdated === 0        ? 'failed'
      : failedSymbols.length > 0  ? 'partial'
      : 'success'

    await supabase.from('market_refresh_runs').update({
      completed_at:      new Date().toISOString(),
      status:            finalStatus,
      symbols_requested: allTickers.length,
      symbols_updated:   symbolsUpdated,
      failed_symbols:    failedSymbols.length > 0 ? failedSymbols : null,
    }).eq('id', runId)

    return NextResponse.json({
      success:          true,
      status:           finalStatus,
      symbolsRequested: allTickers.length,
      symbolsUpdated,
      failedSymbols,
      usersSnapshotted: userIds.length,
    })

  } catch (err) {
    console.error('Cron job error:', err)
    await supabase.from('market_refresh_runs').update({
      completed_at:  new Date().toISOString(),
      status:        'failed',
      error_message: err instanceof Error ? err.message : String(err),
    }).eq('id', runId)

    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
