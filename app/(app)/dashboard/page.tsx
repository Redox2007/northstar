import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Account, Holding, Property, Debt, FireSettings } from '@/types'
import { computeFinancials } from '@/lib/financial-engine'
import { MarketStatusPill } from '@/components/MarketStatusPill'

function fmt(n: number) {
  const neg = n < 0
  return (neg ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US')
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [
    { data: accounts },
    { data: holdings },
    { data: properties },
    { data: debts },
    { data: fireRow },
  ] = await Promise.all([
    supabase.from('accounts').select('*').eq('user_id', user.id),
    supabase.from('holdings').select('*').eq('user_id', user.id),
    supabase.from('properties').select('*').eq('user_id', user.id),
    supabase.from('debts').select('*').eq('user_id', user.id),
    supabase.from('fire_settings').select('*').eq('user_id', user.id).single(),
  ])

  const fire = fireRow as FireSettings | null

  const e = computeFinancials({
    accounts:   (accounts   as Account[])   ?? [],
    holdings:   (holdings   as Holding[])   ?? [],
    properties: (properties as Property[])  ?? [],
    debts:      (debts      as Debt[])      ?? [],
    fire,
  })

  // ── Hero message ──
  const coversPct = e.freedomScore
  let heroMsg: string
  if (e.passiveMonthly >= e.monthlyExpenses) {
    heroMsg = `Your passive income already covers 100% of your ${fmt(e.monthlyExpenses)}/mo expenses — you are financially free today.`
  } else {
    heroMsg = `${fmt(Math.round(e.passiveMonthly))} of your ${fmt(e.monthlyExpenses)}/mo expenses (${coversPct}%) is paid for by passive income.`
  }
  if (e.coastDone) {
    heroMsg += ' ✓ Coast FIRE achieved — your money is already working without new contributions.'
  }

  const freedomOffset = Math.round(314 * (1 - e.freedomScore / 100))

  // ── Milestones ──
  const totalInvested = e.totalInvested
  const milestones = [
    { name: '$300k invested', pct: Math.min(100, Math.round(totalInvested / 300_000 * 100)), done: totalInvested >= 300_000 },
    { name: '$500k invested', pct: Math.min(100, Math.round(totalInvested / 500_000 * 100)), done: totalInvested >= 500_000 },
    { name: '$1M net worth',  pct: Math.min(100, Math.round(e.netWorth      / 1_000_000 * 100)), done: e.netWorth >= 1_000_000 },
  ]

  // ── Dashboard buckets ──
  const buckets = [
    { code: 'RA', label: 'Retirement Assets',   value: e.retirementTotal, negCls: '' },
    { code: 'TX', label: 'Taxable Investments', value: e.taxableTotal,    negCls: '' },
    { code: 'RE', label: 'Real Estate Equity',  value: e.reEquity,        negCls: '' },
    { code: 'IN', label: 'Insurance / IUL',     value: e.insuranceTotal,  negCls: '' },
    { code: 'LQ', label: 'Liquidity',           value: e.liquidityTotal,  negCls: '' },
    { code: 'DT', label: 'Consumer Debt',       value: -e.consumerDebt,   negCls: 'acc' },
  ]

  // ── Passive income progress ──
  const passiveGoal = 75000
  const passivePct  = Math.min(100, Math.round(e.passiveAnnual / passiveGoal * 100))

  // ── Coast FIRE ──
  const coastPct = e.coastPct

  // ── Sparkline (projected growth) ──
  const annualContrib  = fire?.annual_contribution ?? 41000
  const expectedReturn = fire?.expected_return ?? 0.07
  const sparkPts: number[] = [totalInvested]
  let sv = totalInvested
  for (let i = 0; i < 10; i++) {
    sv = sv * (1 + expectedReturn) + annualContrib
    sparkPts.push(sv)
  }
  const maxSpark = Math.max(...sparkPts) || 1
  const sparkPath = sparkPts
    .map((p, i) => `${(i / 10 * 300).toFixed(1)},${(70 - (p / maxSpark) * 58).toFixed(1)}`)
    .join(' ')

  const userName = user.email?.split('@')[0] ?? 'You'

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Good to see you, {userName} 🌱</div>
          <div className="h2">
            {e.freedomScore}% of the way to freedom
            {e.coastDone && <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--accent)', marginLeft: 14 }}>✓ Coast FIRE achieved</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Suspense fallback={<div className="pill">● Loading...</div>}>
            <Suspense fallback={<div className="pill">● Loading...</div>}>
  <MarketStatusPill />
</Suspense>
          </Suspense>
          <div className="avatar">{userName.charAt(0).toUpperCase()}</div>
        </div>
      </div>

      <div className="body">
        {/* Row 1 — Freedom ring + Net worth */}
        <div className="grid2" style={{ marginBottom: 18 }}>
          {/* Freedom score */}
          <div className="card" style={{ background: '#33291f', color: '#fbf6ee', borderColor: '#33291f', display: 'flex', alignItems: 'center', gap: 30 }}>
            <svg viewBox="0 0 120 120" style={{ width: 132, height: 132, flex: 'none' }}>
              <circle cx="60" cy="60" r="50" fill="none" strokeWidth="13" style={{ stroke: '#4a3d2e' }} />
              <circle
                cx="60" cy="60" r="50" fill="none" strokeWidth="13"
                strokeLinecap="round" strokeDasharray="314"
                strokeDashoffset={freedomOffset}
                transform="rotate(-90 60 60)"
                style={{ stroke: 'var(--accent)' }}
              />
            </svg>
            <div>
              <div className="klabel" style={{ color: '#b3a794' }}>Freedom score</div>
              <div className="head kval" style={{ fontSize: 56, lineHeight: 1, margin: '4px 0' }}>{e.freedomScore}%</div>
              {e.coastDone && (
                <div style={{ color: '#d9a441', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>✓ Coast FIRE achieved</div>
              )}
              <div style={{ color: '#d3b58e', fontSize: 14, lineHeight: 1.5, maxWidth: 290 }}>{heroMsg}</div>
            </div>
          </div>

          {/* Net worth */}
          <div className="card">
            <div className="klabel" style={{ marginBottom: 6 }}>Total net worth</div>
            <div className="head kval" style={{ fontSize: 44, lineHeight: 1 }}>{fmt(e.netWorth)}</div>
            <div className="subtle" style={{ marginTop: 6 }}>Retirement + taxable + real estate equity + insurance + liquidity − consumer debt</div>
            <svg viewBox="0 0 300 70" style={{ width: '100%', height: 58, marginTop: 18 }} preserveAspectRatio="none">
              <defs>
                <linearGradient id="wg" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="var(--accent)" stopOpacity=".22" />
                  <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon fill="url(#wg)" points={`${sparkPath} 300,70 0,70`} />
              <polyline fill="none" stroke="var(--accent)" strokeWidth="2.5" points={sparkPath} className="area-l" />
            </svg>
          </div>
        </div>

        {/* Row 2 — 3 KPI cards */}
        <div className="grid3" style={{ marginBottom: 18 }}>
          <div className="card">
            <div className="klabel">Passive income</div>
            <div className="head" style={{ fontSize: 30, margin: '6px 0 4px' }}>
              {fmt(Math.round(e.passiveAnnual))}<span className="mut" style={{ fontSize: 15 }}>/yr</span>
            </div>
            <div className="track" style={{ margin: '10px 0 8px' }}>
              <div className="fill" style={{ width: `${passivePct}%` }} />
            </div>
            <div className="subtle">{passivePct}% of your $75k goal</div>
          </div>

          <div className="card">
            <div className="klabel">Coast FIRE</div>
            <div className="head" style={{ fontSize: 30, margin: '6px 0 4px' }}>{coastPct}%</div>
            <div className="track" style={{ margin: '10px 0 8px' }}>
              <div className={e.coastDone ? 'fill' : 'fillamb'} style={{ width: `${coastPct}%` }} />
            </div>
            <div className="subtle">
              {e.coastDone
                ? `✓ Achieved — ${fmt(Math.round(totalInvested))} invested`
                : `${fmt(Math.round(totalInvested))} of ${fmt(Math.round(e.coastNumber))} coast number`}
            </div>
          </div>

          <div className="card">
            <div className="klabel">Real estate cash flow</div>
            <div className="head grn" style={{ fontSize: 30, margin: '6px 0 4px' }}>
              {e.rentalCF >= 0 ? '+' : '−'}{fmt(Math.abs(e.rentalCF))}<span className="mut" style={{ fontSize: 15 }}>/mo</span>
            </div>
            <div className="track" style={{ margin: '10px 0 8px' }}>
              <div className="fillgrn" style={{ width: `${Math.min(100, e.reCoC * 10)}%` }} />
            </div>
            <div className="subtle">{e.reCoC.toFixed(1)}% cash-on-cash · {fmt(e.reEquity)} equity</div>
          </div>
        </div>

        {/* Row 3 — Milestones + Where your money lives */}
        <div className="grid2">
          <div className="card">
            <div className="rowbtwn" style={{ marginBottom: 16 }}>
              <div className="cardtitle">Milestones</div>
              <span className="chip">{milestones.filter(m => m.done).length} of {milestones.length} reached</span>
            </div>

            {milestones.filter(m => m.done).map(m => (
              <div className="mile" key={m.name} style={{ paddingTop: 0 }}>
                <span className="miletick done">✓</span>
                <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{m.name}</span>
                <span className="subtle">Reached</span>
              </div>
            ))}

            {milestones.filter(m => !m.done).slice(0, 2).map((m, idx, arr) => (
              <div className="mile" key={m.name} style={idx === arr.length - 1 ? { borderBottom: 'none' } : {}}>
                <span className="miletick" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{m.name}</div>
                  <div className="track">
                    <div className="fillamb" style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
                <span className="subtle" style={{ marginLeft: 12 }}>{m.pct}%</span>
              </div>
            ))}
          </div>

          {/* Where your money lives */}
          <div className="card">
            <div className="cardtitle" style={{ marginBottom: 14 }}>Where your money lives</div>
            {buckets.map(b => (
              <div key={b.code} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1e7d8' }}>
                <div className="acctic">{b.code}</div>
                <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{b.label}</div>
                <div style={{ fontWeight: 600 }} className={b.negCls}>{b.value < 0 ? `−${fmt(Math.abs(b.value))}` : fmt(b.value)}</div>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0 0' }}>
              <div style={{ width: 36 }} />
              <div style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>Net Worth</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{fmt(e.netWorth)}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
