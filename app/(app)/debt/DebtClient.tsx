'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Debt, DebtCategory } from '@/types'

type FieldDef = { key: string; label: string; placeholder?: string; type?: string; step?: string }

const DEBT_CATEGORIES: { value: DebtCategory; label: string }[] = [
  { value: 'mortgage',    label: 'Mortgage / Home Loan / HELOC' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'auto',        label: 'Auto Loan' },
  { value: 'student',     label: 'Student Loan' },
  { value: 'margin',      label: 'Margin Loan' },
  { value: 'policy_loan', label: 'Policy Loan' },
  { value: 'other',       label: 'Other' },
]

const FIELDS: FieldDef[] = [
  { key: 'name',          label: 'Debt name',        placeholder: 'e.g. Chase Sapphire' },
  { key: 'type',          label: 'Description',      placeholder: 'e.g. 30yr fixed, Revolving' },
  { key: 'balance',       label: 'Balance ($)',       placeholder: '0', type: 'number', step: '0.01' },
  { key: 'interest_rate', label: 'Interest rate (%)', placeholder: '0', type: 'number', step: '0.01' },
]

function fmt(n: number) {
  return '$' + Math.abs(Math.round(n)).toLocaleString('en-US')
}

type Props = { debts: Debt[]; userId: string }

export default function DebtClient({ debts: initial, userId }: Props) {
  const [debts, setDebts] = useState(initial)
  const [modal, setModal] = useState<null | { mode: 'add' | 'edit'; debt?: Debt }>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const totalDebt       = debts.reduce((s, d) => s + d.balance, 0)
  const monthlyInterest = debts.reduce((s, d) => s + d.balance * d.interest_rate / 100 / 12, 0)
  const avgRate         = totalDebt > 0 ? debts.reduce((s, d) => s + d.balance * d.interest_rate, 0) / totalDebt : 0
  const nonMortgage     = debts.filter(d => (d.category ?? 'other') !== 'mortgage').reduce((s, d) => s + d.balance, 0)

  // Avalanche order: sort by rate descending
  const ranked = [...debts]
    .sort((a, b) => b.interest_rate - a.interest_rate)
    .map((d, idx) => ({ ...d, priority: idx + 1 }))

  const maxBalance = Math.max(...debts.map(d => d.balance), 1)

  function openAdd() {
    setForm({ name: '', type: '', category: 'other', balance: '', interest_rate: '' })
    setModal({ mode: 'add' })
  }

  function openEdit(d: Debt) {
    setForm({ name: d.name, type: d.type, category: d.category ?? 'other', balance: String(d.balance), interest_rate: String(d.interest_rate) })
    setModal({ mode: 'edit', debt: d })
  }

  async function handleSave() {
    setSaving(true)
    const entry = {
      name: form.name || 'Debt',
      type: form.type || '—',
      category: (form.category || 'other') as DebtCategory,
      balance: parseFloat(form.balance) || 0,
      interest_rate: parseFloat(form.interest_rate) || 0,
      user_id: userId,
    }
    if (modal?.mode === 'edit' && modal.debt) {
      await supabase.from('debts').update(entry).eq('id', modal.debt.id)
    } else {
      await supabase.from('debts').insert(entry)
    }
    setSaving(false)
    setModal(null)
    router.refresh()
    const { data } = await supabase.from('debts').select('*').eq('user_id', userId)
    if (data) setDebts(data as Debt[])
  }

  async function handleDelete(id: string) {
    await supabase.from('debts').delete().eq('id', id)
    setDebts(prev => prev.filter(d => d.id !== id))
  }

  return (
    <>
      {/* KPI cards */}
      <div className="grid4" style={{ marginBottom: 22 }}>
        {[
          { label: 'Total debt',          value: fmt(totalDebt),       sub: `${debts.length} accounts` },
          { label: 'Monthly interest',    value: fmt(monthlyInterest), sub: 'Cost of debt / mo' },
          { label: 'Weighted avg rate',   value: avgRate.toFixed(1) + '%', sub: 'Blended interest rate' },
          { label: 'Non-mortgage debt',   value: fmt(nonMortgage),     sub: 'High-priority to clear' },
        ].map(k => (
          <div className="card" key={k.label}>
            <div className="klabel">{k.label}</div>
            <div className="head kval" style={{ fontSize: 28, marginTop: 8 }}>{k.value}</div>
            <div className="subtle" style={{ marginTop: 6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Debt table */}
      <div className="card">
        <div className="rowbtwn" style={{ marginBottom: 6 }}>
          <span className="cardtitle">Debt tracker</span>
          <button className="btn" onClick={openAdd}>+ Add debt</button>
        </div>
        <p className="subtle" style={{ marginBottom: 18 }}>Sorted by avalanche method — highest rate first</p>

        {debts.length === 0 ? (
          <p className="empty">No debts — you&apos;re debt free! Or add one to track it.</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Debt</th>
                <th>Type</th>
                <th className="rt">Balance</th>
                <th className="rt">Rate</th>
                <th className="rt">Progress</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ranked.map(d => {
                const barPct = Math.round(d.balance / maxBalance * 100)
                const isTop  = d.priority === 1
                return (
                  <tr key={d.id}>
                    <td>
                      <span
                        className="chip"
                        style={isTop ? { background: 'var(--accent)', color: '#fff' } : {}}
                      >
                        #{d.priority} {isTop ? '🎯 Focus' : ''}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{d.name}</td>
                    <td><span className="chip">{d.type}</span></td>
                    <td className="rt" style={{ fontWeight: 700 }}>{fmt(d.balance)}</td>
                    <td className="rt acc" style={{ fontWeight: 700 }}>{d.interest_rate.toFixed(1)}%</td>
                    <td className="rt" style={{ minWidth: 130 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                        <div className="track" style={{ width: 90 }}>
                          <div
                            className={isTop ? 'fill' : d.interest_rate < 5 ? 'fillmut' : 'fillamb'}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        <span className="mut" style={{ width: 36, textAlign: 'right', fontSize: 13 }}>{barPct}%</span>
                      </div>
                    </td>
                    <td className="rt">
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="delx" onClick={() => openEdit(d)}>✎</button>
                        <button className="delx" onClick={() => handleDelete(d.id)}>×</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="cardtitle" style={{ marginBottom: 20 }}>
              {modal.mode === 'add' ? 'Add debt' : 'Edit debt'}
            </div>

            {/* Category — determines mortgage detection in engine */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9a8a78', marginBottom: 6 }}>
                Category <span style={{ fontWeight: 400, color: '#b3a794' }}>(used for net worth calc)</span>
              </label>
              <select
                className="inp"
                value={form.category ?? 'other'}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                {DEBT_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {FIELDS.map(field => (
              <div key={field.key} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9a8a78', marginBottom: 6 }}>
                  {field.label}
                </label>
                <input
                  className="inp"
                  type={field.type ?? 'text'}
                  step={field.step}
                  placeholder={field.placeholder}
                  value={form[field.key] ?? ''}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                />
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                className="btn"
                style={{ flex: 1, justifyContent: 'center', background: '#ede6dc', color: '#33291f' }}
                onClick={() => setModal(null)}
              >Cancel</button>
              <button
                className="btn"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={handleSave}
                disabled={saving}
              >{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
