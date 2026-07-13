import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Account, Holding, Property, Debt, FireSettings } from '@/types'
import { computeFinancials } from '@/lib/financial-engine'
import { Suspense } from 'react'
import { MarketStatusPill } from '@/components/MarketStatusPill'

function fmt(n: number) {
  return '$' + Math.abs(Math.round(n)).toLocaleString('en-US')
}

export default async function GoalsPage() {
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

  const { netWorth, totalInvested, passiveAnnual, freedomScore } = e
  const passiveGoal = 75000
  const salaryGoal  = 95000

  const goals = [
    {
      name: '$300k invested',
      sub: `${fmt(totalInvested)} of $300k`,
      pct: Math.min(100, Math.round(totalInvested / 300_000 * 100)),
      done: totalInvested >= 300_000,
    },
    {
      name: '$500k invested',
      sub: `${fmt(totalInvested)} of $500k`,
      pct: Math.min(100, Math.round(totalInvested / 500_000 * 100)),
      done: totalInvested >= 500_000,
    },
    {
      name: '$1M net worth',
      sub: `${fmt(netWorth)} of $1M`,
      pct: Math.min(100, Math.round(netWorth / 1_000_000 * 100)),
      done: netWorth >= 1_000_000,
    },
    {
      name: '$75k passive income',
      sub: `${fmt(Math.round(passiveAnnual))} of $75k / yr`,
      pct: Math.min(100, Math.round(passiveAnnual / passiveGoal * 100)),
      done: passiveAnnual >= passiveGoal,
    },
    {
      name: 'Salary replacement',
      sub: `${fmt(Math.round(passiveAnnual))} of ${fmt(salaryGoal)} salary`,
      pct: Math.min(100, Math.round(passiveAnnual / salaryGoal * 100)),
      done: passiveAnnual >= salaryGoal,
    },
    {
      name: 'Work optional',
      sub: `Freedom score ${freedomScore}%`,
      pct: freedomScore,
      done: freedomScore >= 100,
    },
  ].map(g => ({
    ...g,
    pctStr: g.pct + '%',
    tick:    g.done ? '✓' : '',
    tickCls: g.done ? 'done' : '',
    status:  g.done ? 'Reached' : 'In progress',
    chipCls: g.done ? 'solid' : '',
    fillCls: g.done ? 'fill' : g.pct >= 70 ? 'fillamb' : 'fillmut',
  }))

  const doneCount = goals.filter(g => g.done).length

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Your milestones</div>
          <div className="h2">Goals</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Suspense fallback={<div className="pill">● Loading...</div>}>
  <MarketStatusPill />
</Suspense>
          <div className="avatar">{(user.email ?? 'U').charAt(0).toUpperCase()}</div>
        </div>
      </div>

      <div className="body">
        {/* grid3 layout matching new design */}
        <div className="grid3">
          {goals.map(g => (
            <div className="card" key={g.name}>
              <div className="rowbtwn" style={{ marginBottom: 14 }}>
                <span className={`miletick${g.done ? ' done' : ''}`}>{g.tick}</span>
                <span className={`chip${g.done ? ' solid' : ''}`}>{g.status}</span>
              </div>
              <div className="cardtitle" style={{ fontSize: 18 }}>{g.name}</div>
              <div className="subtle" style={{ margin: '6px 0 16px' }}>{g.sub}</div>
              <div className="track">
                <div className={g.fillCls} style={{ width: g.pctStr }} />
              </div>
              <div className="rowbtwn" style={{ marginTop: 9 }}>
                <span className="subtle">Progress</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{g.pctStr}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
