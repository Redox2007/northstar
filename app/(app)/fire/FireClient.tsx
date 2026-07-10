'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer
} from 'recharts'
import { FireSettings } from '@/types'

function fmt(n: number) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return '$' + Math.round(n / 1_000) + 'k'
  return '$' + Math.round(n).toLocaleString('en-US')
}
function fmtFull(n: number) {
  const neg = n < 0
  return (neg ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US')
}

const SCENARIOS = {
  lean:       { annual_spending: 45000, annual_contribution: 52000 },
  current:    { annual_spending: 60000, annual_contribution: 41000 },
  aggressive: { annual_spending: 60000, annual_contribution: 68000 },
}

type Props = {
  settings:       FireSettings | null
  userId:         string
  passiveMonthly: number
  totalInvested:  number  // investable assets (retirement + taxable), pre-populated from accounts
}

export default function FireClient({ settings: init, userId, passiveMonthly, totalInvested }: Props) {
  const safePassive = Number.isFinite(passiveMonthly) ? passiveMonthly : 0

  // Always use live engine value for invested — other saved settings (age, contribution, etc.) are preserved
  const [f, setF] = useState<FireSettings>({
    ...(init ?? {
      id: '', user_id: userId,
      annual_contribution: 41000,
      expected_return: 0.07,
      annual_spending: 60000,
      current_age: 39,
      monthly_expenses: 5000,
      target_retirement_age: 65,
      updated_at: '',
    }),
    invested: totalInvested,
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const update = useCallback((patch: Partial<FireSettings>) => {
    setF(prev => ({ ...prev, ...patch }))
  }, [])

  // ── Computations ──
  const fiNumber           = f.annual_spending * 25
  const targetRetireAge    = f.target_retirement_age ?? 65
  const yearsToRetirement  = Math.max(0, targetRetireAge - f.current_age)
  const coastNumber        = yearsToRetirement === 0
    ? fiNumber
    : fiNumber / Math.pow(1 + f.expected_return, yearsToRetirement)
  const coastPct  = Math.min(100, Math.round(f.invested / coastNumber * 100))
  const coastDone = f.invested >= coastNumber

  // Projection to FIRE number
  let v = f.invested, yrs = 0
  const pts: { year: number; value: number }[] = [{ year: f.current_age, value: v }]
  while (v < fiNumber && yrs < 50) {
    v = v * (1 + f.expected_return) + f.annual_contribution
    yrs++
    pts.push({ year: f.current_age + yrs, value: Math.round(v) })
  }
  const retireAge = f.current_age + yrs

  // Freedom score = passive monthly ÷ current monthly expenses
  const freedomScore = Math.max(0, Math.min(100,
    Math.round(safePassive / Math.max(f.monthly_expenses, 1) * 100)
  ))

  // Cash-flow FIRE progress
  const cfGoal = 75000
  const cfPct  = Math.min(100, Math.round(safePassive * 12 / cfGoal * 100))

  const coastMsg = coastDone
    ? "✓ Coast FIRE achieved — even with zero new contributions, today's investments grow to fund retirement."
    : `Reach ${fmtFull(coastNumber)} invested and you could stop contributing entirely.`

  async function saveSettings() {
    setSaving(true)
    const payload = {
      user_id:               userId,
      invested:              f.invested,
      annual_contribution:   f.annual_contribution,
      expected_return:       f.expected_return,
      annual_spending:       f.annual_spending,
      current_age:           f.current_age,
      monthly_expenses:      f.monthly_expenses,
      target_retirement_age: targetRetireAge,
      updated_at:            new Date().toISOString(),
    }
    if (init?.id) {
      await supabase.from('fire_settings').update(payload).eq('id', init.id)
    } else {
      await supabase.from('fire_settings').upsert(payload)
    }
    setSaving(false)
  }

  const sliders = [
    {
      label:   'Investable assets (excl. home equity)',
      sub:     'Retirement + taxable accounts',
      key:     'invested' as const,
      value:   f.invested, min: 0, max: 1500000, step: 5000,
      display: fmtFull(f.invested),
    },
    {
      label:   'Annual contribution',
      key:     'annual_contribution' as const,
      value:   f.annual_contribution, min: 0, max: 120000, step: 1000,
      display: fmtFull(f.annual_contribution) + '/yr',
    },
    {
      label:   'Expected real return',
      key:     'expected_return' as const,
      value:   f.expected_return * 100, min: 3, max: 10, step: 0.5,
      display: (f.expected_return * 100).toFixed(1) + '%',
      isReturn: true,
    },
    {
      label:   'Annual spending in retirement',
      sub:     'Sets your FIRE number (25× rule)',
      key:     'annual_spending' as const,
      value:   f.annual_spending, min: 30000, max: 150000, step: 1000,
      display: fmtFull(f.annual_spending) + '/yr',
    },
    {
      label:   'Current age',
      key:     'current_age' as const,
      value:   f.current_age, min: 25, max: 70, step: 1,
      display: String(f.current_age),
    },
    {
      label:   'Target retirement age',
      sub:     'Used for Coast FIRE compounding',
      key:     'target_retirement_age' as const,
      value:   targetRetireAge, min: 45, max: 75, step: 1,
      display: String(targetRetireAge),
    },
    {
      label:   'Current monthly expenses',
      sub:     'Denominator for freedom score',
      key:     'monthly_expenses' as const,
      value:   f.monthly_expenses, min: 1000, max: 20000, step: 100,
      display: fmtFull(f.monthly_expenses) + '/mo',
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 22, alignItems: 'start' }}>

      {/* ── Left: Assumptions card ── */}
      <div className="card">
        <div className="cardtitle" style={{ marginBottom: 20 }}>Your assumptions</div>

        {/* Scenarios */}
        <div style={{ marginBottom: 24 }}>
          <div className="klabel" style={{ marginBottom: 10 }}>Scenarios</div>
          <div className="seg">
            <button className="segbtn" onClick={() => update(SCENARIOS.lean)}>🍃 Lean</button>
            <button className="segbtn" onClick={() => update(SCENARIOS.current)}>🎯 Current plan</button>
            <button className="segbtn" onClick={() => update(SCENARIOS.aggressive)}>🚀 Aggressive</button>
          </div>
        </div>

        {sliders.map(s => (
          <div className="ctrlrow" key={s.key}>
            <div className="ctrltop">
              <div>
                <span className="klabel">{s.label}</span>
                {'sub' in s && s.sub && (
                  <div style={{ fontSize: 11, color: '#b3a794', marginTop: 1 }}>{s.sub}</div>
                )}
              </div>
              <span className="ctrlval">{s.display}</span>
            </div>
            <input
              className="slider"
              type="range"
              min={s.min} max={s.max} step={s.step}
              value={s.value}
              onChange={e => {
                const raw = parseFloat(e.target.value)
                update({ [s.key]: s.isReturn ? raw / 100 : raw } as Partial<FireSettings>)
              }}
            />
          </div>
        ))}

        <button
          className="btn"
          onClick={saveSettings}
          disabled={saving}
          style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>

      {/* ── Right: Results ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Projection chart — dark card */}
        <div className="card" style={{ background: '#33291f', color: '#fbf6ee', borderColor: '#33291f' }}>
          <div className="rowbtwn">
            <div>
              <div className="klabel" style={{ color: '#b3a794' }}>Retirement age projection</div>
              <div className="bignum" style={{ margin: '8px 0 2px' }}>Age {retireAge}</div>
              <div style={{ color: '#d3b58e', fontSize: 13.5 }}>{yrs} years to full financial independence</div>
            </div>
            <span className="statuschip">▲ {retireAge}</span>
          </div>
          <ResponsiveContainer width="100%" height={150} style={{ marginTop: 18 }}>
            <AreaChart data={pts} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="fgp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#d9a441" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#d9a441" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#b3a794' }} />
              <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10, fill: '#b3a794' }} width={52} />
              <Tooltip
                formatter={(v: number) => [fmtFull(v), 'Portfolio']}
                contentStyle={{ background: '#43372a', border: '1px solid #5a4c3b', borderRadius: 8, fontSize: 12, color: '#fbf6ee' }}
              />
              <ReferenceLine
                y={fiNumber}
                stroke="#d9a441"
                strokeDasharray="5 3"
                label={{ value: 'FIRE', fill: '#d9a441', fontSize: 11, position: 'insideTopRight' }}
              />
              <Area type="monotone" dataKey="value" stroke="#d9a441" strokeWidth={2.5} fill="url(#fgp)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 4 result cards */}
        <div className="grid4" style={{ gap: 14 }}>
          <div className="card">
            <div className="klabel">Coast FIRE number</div>
            <div className="head" style={{ fontSize: 22, margin: '6px 0 8px' }}>{fmt(coastNumber)}</div>
            <span className="statuschip" style={{ fontSize: 11.5, ...(coastDone ? {} : { background: '#fbeede', color: '#b0552f' }) }}>
              {coastDone ? '✓ Achieved' : `${coastPct}% funded`}
            </span>
            <div className="subtle" style={{ marginTop: 6, fontSize: 11 }}>
              Target age {targetRetireAge} · {yearsToRetirement}yr runway
            </div>
          </div>
          <div className="card">
            <div className="klabel">Traditional FIRE</div>
            <div className="head" style={{ fontSize: 22, margin: '6px 0 8px' }}>{fmt(fiNumber)}</div>
            <div className="subtle">25× annual retirement spending</div>
          </div>
          <div className="card">
            <div className="klabel">Cash-flow FIRE</div>
            <div className="head" style={{ fontSize: 22, margin: '6px 0 8px' }}>$75k<span className="mut" style={{ fontSize: 14 }}>/yr</span></div>
            <div className="track" style={{ marginBottom: 6 }}>
              <div className="fill" style={{ width: `${cfPct}%` }} />
            </div>
            <div className="subtle">{fmt(Math.round(safePassive * 12))} passive today · {cfPct}%</div>
          </div>
          <div className="card">
            <div className="klabel">Freedom score today</div>
            <div className="head" style={{ fontSize: 22, margin: '6px 0 8px' }}>{freedomScore}%</div>
            <div className="subtle">Passive income ÷ current monthly expenses</div>
          </div>
        </div>

        {/* Coast FIRE / contribution message */}
        <div className="card" style={coastDone ? { borderColor: '#c8a96e' } : {}}>
          <div className="rowbtwn">
            <div>
              <div className="klabel">Monthly contribution needed</div>
              <div className="head acc" style={{ fontSize: 24, marginTop: 4 }}>
                {fmtFull(Math.round(f.annual_contribution / 12))}/mo
              </div>
            </div>
            <div className="subtle" style={{ maxWidth: 260, textAlign: 'right' }}>{coastMsg}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
