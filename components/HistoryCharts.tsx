'use client'

import { useMemo, useState } from 'react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer
} from 'recharts'
import { PortfolioSnapshot } from '@/types'

function fmt(n: number) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return '$' + Math.round(n / 1_000) + 'k'
  return '$' + Math.round(n).toLocaleString('en-US')
}
function fmtFull(n: number) {
  const neg = n < 0
  return (neg ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US')
}
function fmtDateShort(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const RANGE_OPTIONS = [
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
  { key: '1y',  label: '1Y',  days: 365 },
  { key: 'all', label: 'All', days: null as number | null },
]

const tooltipStyle = { background: '#43372a', border: '1px solid #5a4c3b', borderRadius: 8, fontSize: 12, color: '#fbf6ee' }
const tickStyle    = { fontSize: 11, fill: '#b3a794' }

type Props = { snapshots: PortfolioSnapshot[] }

export default function HistoryCharts({ snapshots }: Props) {
  const [range, setRange] = useState('90d')

  const filtered = useMemo(() => {
    const opt = RANGE_OPTIONS.find(o => o.key === range)
    if (!opt?.days) return snapshots
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - opt.days)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    return snapshots.filter(s => s.snapshot_date >= cutoffStr)
  }, [snapshots, range])

  const data = useMemo(() => filtered.map(s => ({
    date:         s.snapshot_date,
    netWorth:     s.net_worth,
    freedomScore: s.freedom_score,
    passiveAnnual: s.passive_annual,
  })), [filtered])

  if (snapshots.length === 0) {
    return (
      <div className="card">
        <div className="cardtitle" style={{ marginBottom: 8 }}>Your history</div>
        <p className="subtle">History builds up daily — check back tomorrow to start seeing your trends.</p>
      </div>
    )
  }

  const sparse = snapshots.length === 1

  return (
    <div className="card">
      <div className="rowbtwn" style={{ marginBottom: 18 }}>
        <div className="cardtitle">Your history</div>
        <div className="seg">
          {RANGE_OPTIONS.map(o => (
            <button
              key={o.key}
              className={`segbtn${range === o.key ? ' on' : ''}`}
              onClick={() => setRange(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {sparse ? (
        <p className="subtle">Only 1 day of history recorded so far — trends will appear as more daily snapshots come in.</p>
      ) : (
        <div className="grid3">
          <div>
            <div className="klabel" style={{ marginBottom: 8 }}>Net worth</div>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="hcNetWorth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#d9a441" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#d9a441" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={tickStyle} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: '#b3a794' }} width={52} />
                <Tooltip
                  labelFormatter={fmtDateShort}
                  formatter={(v: number) => [fmtFull(v), 'Net worth']}
                  contentStyle={tooltipStyle}
                />
                <Area type="monotone" dataKey="netWorth" stroke="#d9a441" strokeWidth={2.5} fill="url(#hcNetWorth)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div>
            <div className="klabel" style={{ marginBottom: 8 }}>Freedom score</div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={tickStyle} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#b3a794' }} width={40} />
                <Tooltip
                  labelFormatter={fmtDateShort}
                  formatter={(v: number) => [`${v}%`, 'Freedom score']}
                  contentStyle={tooltipStyle}
                />
                <Line type="monotone" dataKey="freedomScore" stroke="#c26a45" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div>
            <div className="klabel" style={{ marginBottom: 8 }}>Passive income</div>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="hcPassive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#d9a441" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#d9a441" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={tickStyle} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: '#b3a794' }} width={52} />
                <Tooltip
                  labelFormatter={fmtDateShort}
                  formatter={(v: number) => [fmtFull(v), 'Passive income/yr']}
                  contentStyle={tooltipStyle}
                />
                <Area type="monotone" dataKey="passiveAnnual" stroke="#d9a441" strokeWidth={2.5} fill="url(#hcPassive)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
