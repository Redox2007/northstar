'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AllocationTargets } from '@/types'
import { AllocationBucket, AllocationBucketKey } from '@/lib/allocation'

function fmt(n: number) {
  return '$' + Math.abs(Math.round(n)).toLocaleString('en-US')
}

const DEFAULT_TARGETS: Record<AllocationBucketKey, number> = {
  us_stock: 60,
  international_stock: 15,
  bond: 10,
  cash: 5,
  real_estate: 5,
  insurance: 5,
}

const TARGET_FIELD: Record<AllocationBucketKey, keyof AllocationTargets> = {
  us_stock: 'us_stock_pct',
  international_stock: 'international_pct',
  bond: 'bond_pct',
  cash: 'cash_pct',
  real_estate: 'real_estate_pct',
  insurance: 'insurance_pct',
}

type Props = {
  buckets: AllocationBucket[]
  grossAssets: number
  targets: AllocationTargets | null
  userId: string
}

export default function AllocationClient({ buckets, grossAssets, targets: initTargets, userId }: Props) {
  const [targets, setTargets] = useState<Record<AllocationBucketKey, number>>(() => {
    const t: Record<AllocationBucketKey, number> = { ...DEFAULT_TARGETS }
    if (initTargets) {
      for (const key of Object.keys(TARGET_FIELD) as AllocationBucketKey[]) {
        t[key] = initTargets[TARGET_FIELD[key]] as number
      }
    }
    return t
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const sum = Object.values(targets).reduce((s, v) => s + v, 0)

  async function saveTargets() {
    setSaving(true)
    const payload = {
      user_id: userId,
      us_stock_pct: targets.us_stock,
      international_pct: targets.international_stock,
      bond_pct: targets.bond,
      cash_pct: targets.cash,
      real_estate_pct: targets.real_estate,
      insurance_pct: targets.insurance,
      updated_at: new Date().toISOString(),
    }
    if (initTargets?.id) {
      await supabase.from('allocation_targets').update(payload).eq('id', initTargets.id)
    } else {
      await supabase.from('allocation_targets').upsert(payload)
    }
    setSaving(false)
  }

  return (
    <div className="grid2" style={{ alignItems: 'start' }}>
      {/* Current vs target */}
      <div className="card">
        <div className="cardtitle" style={{ marginBottom: 6 }}>Current allocation</div>
        <div className="subtle" style={{ marginBottom: 18 }}>{fmt(grossAssets)} in gross assets</div>
        {buckets.map(b => {
          const target = targets[b.key]
          const overUnder = b.pct - target
          return (
            <div key={b.key} style={{ marginBottom: 16 }}>
              <div className="rowbtwn" style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{b.label}</span>
                <span style={{ fontSize: 13 }}>
                  <b>{b.pct}%</b>
                  <span className="subtle"> / {target}% target</span>
                  {' '}
                  <span className={overUnder >= 0 ? 'grn' : 'acc'} style={{ fontWeight: 600 }}>
                    ({overUnder >= 0 ? '+' : '−'}{Math.abs(overUnder)})
                  </span>
                </span>
              </div>
              <div className="track">
                <div className="fill" style={{ width: `${Math.min(100, b.pct)}%` }} />
              </div>
              <div className="subtle" style={{ marginTop: 4 }}>{fmt(b.value)}</div>
            </div>
          )
        })}
      </div>

      {/* Target settings */}
      <div className="card">
        <div className="cardtitle" style={{ marginBottom: 20 }}>Target allocation</div>
        {buckets.map(b => (
          <div key={b.key} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9a8a78', marginBottom: 6 }}>
              {b.label} (%)
            </label>
            <input
              className="inp"
              type="number"
              min={0}
              max={100}
              step={1}
              value={targets[b.key]}
              onChange={e => setTargets(t => ({ ...t, [b.key]: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        ))}

        {sum !== 100 && (
          <p className="subtle" style={{ color: '#c0612b', marginBottom: 12 }}>
            Targets sum to {sum}% — consider adjusting so they total 100%.
          </p>
        )}

        <button className="btn" onClick={saveTargets} disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
          {saving ? 'Saving…' : 'Save targets'}
        </button>
      </div>
    </div>
  )
}
