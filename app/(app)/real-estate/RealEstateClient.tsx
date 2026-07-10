'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Property, PropertyType } from '@/types'

const TYPE_LABELS: Record<PropertyType, string> = {
  primary:   'Primary Home',
  secondary: 'Secondary Home',
  vacation:  'Vacation Home',
  rental:    'Rental Property',
}

function fmt(n: number) {
  const neg = n < 0
  return (neg ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US')
}

const EMPTY_FORM = {
  type: 'rental' as PropertyType,
  name: '', value: '', mortgage_balance: '',
  monthly_pi: '', monthly_rent: '', monthly_expenses: '', cash_invested: '',
}

type Props = { properties: Property[]; userId: string }

export default function RealEstateClient({ properties: initial, userId }: Props) {
  const [properties, setProperties] = useState(initial)
  const [modal, setModal] = useState<null | { mode: 'add' | 'edit'; prop?: Property }>(null)
  const [form, setForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const isRental = (p: { type?: string }) => (p.type ?? 'rental') === 'rental'
  const rentalProps = properties.filter(isRental)

  const rePortValue  = properties.reduce((s, p) => s + p.value, 0)
  const reEquity     = properties.reduce((s, p) => s + (p.value - p.mortgage_balance), 0)
  const reMonthlyCF  = rentalProps.reduce((s, p) => s + (p.monthly_rent - p.monthly_expenses - p.monthly_pi), 0)
  const reCashIn     = rentalProps.reduce((s, p) => s + p.cash_invested, 0)
  const reCoC        = reCashIn > 0 ? (reMonthlyCF * 12) / reCashIn * 100 : 0

  function openAdd() {
    setForm({ ...EMPTY_FORM })
    setModal({ mode: 'add' })
  }

  function openEdit(p: Property) {
    setForm({
      type: p.type ?? 'rental',
      name: p.name,
      value: String(p.value),
      mortgage_balance: String(p.mortgage_balance),
      monthly_pi: String(p.monthly_pi),
      monthly_rent: String(p.monthly_rent),
      monthly_expenses: String(p.monthly_expenses),
      cash_invested: String(p.cash_invested),
    })
    setModal({ mode: 'edit', prop: p })
  }

  async function handleSave() {
    setSaving(true)
    const n = (k: keyof typeof form) => parseFloat(form[k] as string) || 0
    const rental = form.type === 'rental'
    const entry = {
      type: form.type,
      name: form.name || 'Property',
      value: n('value'),
      mortgage_balance: n('mortgage_balance'),
      monthly_pi: n('monthly_pi'),
      monthly_rent: rental ? n('monthly_rent') : 0,
      monthly_expenses: rental ? n('monthly_expenses') : 0,
      cash_invested: rental ? n('cash_invested') : 0,
      user_id: userId,
    }
    if (modal?.mode === 'edit' && modal.prop) {
      await supabase.from('properties').update(entry).eq('id', modal.prop.id)
    } else {
      await supabase.from('properties').insert(entry)
    }
    setSaving(false)
    setModal(null)
    router.refresh()
    const { data } = await supabase.from('properties').select('*').eq('user_id', userId)
    if (data) setProperties(data as Property[])
  }

  async function handleDelete(id: string) {
    await supabase.from('properties').delete().eq('id', id)
    setProperties(prev => prev.filter(p => p.id !== id))
  }

  return (
    <>
      {/* Portfolio KPIs */}
      <div className="grid4" style={{ marginBottom: 22 }}>
        <div className="card">
          <div className="klabel">Portfolio value</div>
          <div className="head kval" style={{ fontSize: 30, marginTop: 6 }}>{fmt(rePortValue)}</div>
        </div>
        <div className="card">
          <div className="klabel">Total equity</div>
          <div className="head kval acc" style={{ fontSize: 30, marginTop: 6 }}>{fmt(reEquity)}</div>
        </div>
        <div className="card">
          <div className="klabel">Monthly cash flow</div>
          <div className={`head kval ${reMonthlyCF >= 0 ? 'grn' : 'acc'}`} style={{ fontSize: 30, marginTop: 6 }}>
            {reMonthlyCF >= 0 ? '+' : '−'}{fmt(Math.abs(reMonthlyCF))}
          </div>
        </div>
        <div className="card">
          <div className="klabel">Avg cash-on-cash</div>
          <div className="head kval" style={{ fontSize: 30, marginTop: 6 }}>{reCoC.toFixed(1)}%</div>
        </div>
      </div>

      <div className="rowbtwn" style={{ marginBottom: 16 }}>
        <span className="cardtitle">Properties</span>
        <button className="btn" onClick={openAdd}>+ Add property</button>
      </div>

      {properties.length === 0 ? (
        <div className="card empty">No properties yet — add your first property to track equity and value.</div>
      ) : (
        properties.map(p => {
          const rental    = isRental(p)
          const equity    = p.value - p.mortgage_balance
          const noi       = (p.monthly_rent - p.monthly_expenses) * 12
          const cfM       = p.monthly_rent - p.monthly_expenses - p.monthly_pi
          const cfY       = cfM * 12
          const cap       = p.value > 0 ? noi / p.value * 100 : 0
          const coc       = p.cash_invested > 0 ? cfY / p.cash_invested * 100 : 0
          const ltv       = p.value > 0 ? p.mortgage_balance / p.value * 100 : 0
          const eqPct     = p.value > 0 ? equity / p.value * 100 : 0
          const typeLabel = TYPE_LABELS[p.type ?? 'rental']

          return (
            <div className="card" key={p.id} style={{ marginBottom: 18 }}>
              {/* Header */}
              <div className="rowbtwn" style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="cardtitle" style={{ fontSize: 18 }}>{p.name}</div>
                  {rental ? (
                    <span className="statuschip" style={cfM < 0 ? { background: '#fbeede', color: '#b0552f' } : {}}>
                      {cfM >= 0 ? '● Cash-flow positive' : '● Negative cash flow'}
                    </span>
                  ) : (
                    <span className="chip">● {typeLabel}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button className="delx" onClick={() => openEdit(p)}>✎</button>
                  <button className="delx" onClick={() => handleDelete(p.id)}>×</button>
                </div>
              </div>

              {/* Two-column layout */}
              <div className="grid2" style={{ gap: 24, alignItems: 'start' }}>
                {/* Left col */}
                <div>
                  <div className="grid3" style={{ gap: 14 }}>
                    <div>
                      <div className="klabel">Property value</div>
                      <div className="head" style={{ fontSize: 24, marginTop: 4 }}>{fmt(p.value)}</div>
                    </div>
                    <div>
                      <div className="klabel">Mortgage</div>
                      <div className="head" style={{ fontSize: 24, marginTop: 4 }}>{fmt(p.mortgage_balance)}</div>
                    </div>
                    <div>
                      <div className="klabel">Equity</div>
                      <div className="head acc" style={{ fontSize: 24, marginTop: 4 }}>{fmt(equity)}</div>
                    </div>
                  </div>

                  <div className="track" style={{ marginTop: 18 }}>
                    <div className="fill" style={{ width: `${Math.min(100, eqPct)}%` }} />
                  </div>
                  <div className="subtle" style={{ marginTop: 8 }}>
                    {Math.round(eqPct)}% equity · loan-to-value {Math.round(ltv)}%
                  </div>

                  {rental ? (
                    <div className="grid4" style={{ gap: 10, marginTop: 20 }}>
                      <div>
                        <div className="klabel">NOI/yr</div>
                        <div className="head" style={{ fontSize: 18, marginTop: 3 }}>{fmt(noi)}</div>
                      </div>
                      <div>
                        <div className="klabel">Cap rate</div>
                        <div className="head" style={{ fontSize: 18, marginTop: 3 }}>{cap.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="klabel">Cash-on-cash</div>
                        <div className="head acc" style={{ fontSize: 18, marginTop: 3 }}>{coc.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="klabel">Annual CF</div>
                        <div className="head grn" style={{ fontSize: 18, marginTop: 3 }}>{fmt(cfY)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="subtle" style={{ marginTop: 20 }}>
                      No income to track — this property only contributes value and equity to your net worth.
                    </div>
                  )}
                </div>

                {/* Right col — cash flow breakdown (rentals only) */}
                {rental && (
                  <div style={{ background: '#f9f1e6', borderRadius: 14, padding: 18 }}>
                    <div className="cardtitle" style={{ marginBottom: 6 }}>Monthly cash flow</div>
                    <div className="rowbtwn" style={{ padding: '9px 0', borderBottom: '1px solid #eee0cd' }}>
                      <span className="mut">Rent collected</span>
                      <span className="grn" style={{ fontWeight: 600 }}>+{fmt(p.monthly_rent)}</span>
                    </div>
                    <div className="rowbtwn" style={{ padding: '9px 0', borderBottom: '1px solid #eee0cd' }}>
                      <span className="mut">Operating expenses</span>
                      <span style={{ fontWeight: 600 }}>−{fmt(p.monthly_expenses)}</span>
                    </div>
                    <div className="rowbtwn" style={{ padding: '9px 0', borderBottom: '1px solid #eee0cd' }}>
                      <span className="mut">Mortgage (P&amp;I)</span>
                      <span style={{ fontWeight: 600 }}>−{fmt(p.monthly_pi)}</span>
                    </div>
                    <div className="rowbtwn" style={{ padding: '12px 0 0' }}>
                      <span style={{ fontWeight: 700 }}>Net cash flow</span>
                      <span className={`head ${cfM >= 0 ? 'grn' : 'acc'}`} style={{ fontSize: 24 }}>
                        {cfM >= 0 ? '+' : '−'}{fmt(Math.abs(cfM))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })
      )}

      {/* Modal */}
      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="cardtitle" style={{ marginBottom: 20 }}>
              {modal.mode === 'add' ? 'Add property' : 'Edit property'}
            </div>

            {/* Type selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9a8a78', marginBottom: 6 }}>
                Property type
              </label>
              <select
                className="inp"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as PropertyType }))}
              >
                <option value="primary">Primary Home</option>
                <option value="secondary">Secondary Home</option>
                <option value="vacation">Vacation Home</option>
                <option value="rental">Rental Property</option>
              </select>
            </div>

            {/* Common fields */}
            {([
              { key: 'name',             label: 'Property name',           placeholder: 'e.g. Maple Street Duplex', inputType: 'text'   },
              { key: 'value',            label: 'Property value ($)',       placeholder: '0',                        inputType: 'number' },
              { key: 'mortgage_balance', label: 'Mortgage balance ($)',     placeholder: '0',                        inputType: 'number' },
              { key: 'monthly_pi',       label: 'Monthly mortgage P&I ($)', placeholder: '0',                        inputType: 'number' },
            ] as const).map(field => (
              <div key={field.key} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9a8a78', marginBottom: 6 }}>
                  {field.label}
                </label>
                <input
                  className="inp"
                  type={field.inputType}
                  placeholder={field.placeholder}
                  value={form[field.key]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                />
              </div>
            ))}

            {/* Rental-only fields */}
            {form.type === 'rental' && ([
              { key: 'monthly_rent',     label: 'Monthly rent ($)'               },
              { key: 'monthly_expenses', label: 'Monthly operating expenses ($)'  },
              { key: 'cash_invested',    label: 'Total cash invested ($)'         },
            ] as const).map(field => (
              <div key={field.key} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9a8a78', marginBottom: 6 }}>
                  {field.label}
                </label>
                <input
                  className="inp"
                  type="number"
                  placeholder="0"
                  value={form[field.key]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                />
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                className="btn"
                style={{ flex: 1, justifyContent: 'center', background: '#ede6dc', color: '#33291f' }}
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
