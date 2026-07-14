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

type MetricKey = 'netWorth' | 'freedomScore' | 'passiveAnnual' | 'investedAssets'

type MetricDef = {
  key: MetricKey
  label: string
  chartType: 'area' | 'line'
  color: string
  domain?: [number, number]
  axisFormatter: (n: number) => string
  tooltipFormatter: (n: number) => string
  tooltipLabel: string
}

const METRICS: MetricDef[] = [
  { key: 'netWorth',       label: 'Net Worth',       chartType: 'area', color: '#d9a441', axisFormatter: fmt, tooltipFormatter: fmtFull, tooltipLabel: 'Net worth' },
  { key: 'freedomScore',   label: 'Freedom Score',   chartType: 'line', color: '#c26a45', domain: [0, 100], axisFormatter: v => `${v}%`, tooltipFormatter: v => `${v}%`, tooltipLabel: 'Freedom score' },
  { key: 'passiveAnnual',  label: 'Passive Income',  chartType: 'area', color: '#4f7a3e', axisFormatter: fmt, tooltipFormatter: fmtFull, tooltipLabel: 'Passive income/yr' },
  { key: 'investedAssets', label: 'Invested Assets', chartType: 'area', color: '#9a6c3e', axisFormatter: fmt, tooltipFormatter: fmtFull, tooltipLabel: 'Invested assets' },
]

const tooltipStyle = { background: '#43372a', border: '1px solid #5a4c3b', borderRadius: 8, fontSize: 12, color: '#fbf6ee' }
const tickStyle    = { fontSize: 11, fill: '#b3a794' }

type Props = { snapshots: PortfolioSnapshot[] }

export default function HistoryCharts({ snapshots }: Props) {
  const [range, setRange] = useState('90d')
  const [metric, setMetric] = useState<MetricKey>('netWorth')

  const filtered = useMemo(() => {
    const opt = RANGE_OPTIONS.find(o => o.key === range)
    if (!opt?.days) return snapshots
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - opt.days)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    return snapshots.filter(s => s.snapshot_date >= cutoffStr)
  }, [snapshots, range])

  const data = useMemo(() => filtered.map(s => ({
    date:           s.snapshot_date,
    netWorth:       s.net_worth,
    freedomScore:   s.freedom_score,
    passiveAnnual:  s.passive_annual,
    investedAssets: s.invested_assets,
  })), [filtered])

  const activeMetric = METRICS.find(m => m.key === metric)!

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

      <div className="seg" style={{ marginBottom: 18 }}>
        {METRICS.map(m => (
          <button
            key={m.key}
            className={`segbtn${metric === m.key ? ' on' : ''}`}
            onClick={() => setMetric(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {sparse ? (
        <p className="subtle">Only 1 day of history recorded so far — trends will appear as more daily snapshots come in.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          {activeMetric.chartType === 'area' ? (
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="hcGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={activeMetric.color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={activeMetric.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={tickStyle} />
              <YAxis domain={activeMetric.domain ?? ['auto', 'auto']} tickFormatter={activeMetric.axisFormatter} tick={{ fontSize: 10, fill: '#b3a794' }} width={52} />
              <Tooltip
                labelFormatter={fmtDateShort}
                formatter={(v: number) => [activeMetric.tooltipFormatter(v), activeMetric.tooltipLabel]}
                contentStyle={tooltipStyle}
              />
              <Area type="monotone" dataKey={activeMetric.key} stroke={activeMetric.color} strokeWidth={2.5} fill="url(#hcGradient)" dot={false} />
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={tickStyle} />
              <YAxis domain={activeMetric.domain ?? ['auto', 'auto']} tickFormatter={activeMetric.axisFormatter} tick={{ fontSize: 10, fill: '#b3a794' }} width={40} />
              <Tooltip
                labelFormatter={fmtDateShort}
                formatter={(v: number) => [activeMetric.tooltipFormatter(v), activeMetric.tooltipLabel]}
                contentStyle={tooltipStyle}
              />
              <Line type="monotone" dataKey={activeMetric.key} stroke={activeMetric.color} strokeWidth={2.5} dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  )
}
