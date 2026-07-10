'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Account, AccountCategory } from '@/types'

const CATEGORIES: { value: AccountCategory; label: string }[] = [
  { value: 'retirement', label: 'Retirement Assets' },
  { value: 'taxable',    label: 'Taxable Investments' },
  { value: 'insurance',  label: 'Insurance / IUL' },
  { value: 'liquidity',  label: 'Liquidity' },
]

function fmt(n: number) {
  const neg = n < 0
  return (neg ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US')
}

type Props = {
  accounts:            Account[]
  userId:              string
  holdingsByCategory:  Record<string, number>  // holdings market value bucketed by account category
  holdingsByAccountId: Record<string, number>  // holdings market value per linked account (for reconciliation)
  reEquity:            number
}

type ModalState = { mode: 'add' | 'edit'; account?: Account } | null

export default function AccountsClient({
  accounts: initial, userId,
  holdingsByCategory, holdingsByAccountId, reEquity,
}: Props) {
  const [accounts, setAccounts] = useState(initial)
  const [modal, setModal]       = useState<ModalState>(null)
  const [form, setForm]         = useState<Record<string, string>>({})
  const [saving, setSaving]     = useState(false)
  const router  = useRouter()
  const supabase = createClient()

  const linkedAccountIds = new Set(Object.keys(holdingsByAccountId))

  // Unlinked account balances per category
  const unlinkedTotal = (cat: string) =>
    accounts
      .filter(a => (a.category ?? 'liquidity') === cat && !linkedAccountIds.has(a.id))
      .reduce((s, a) => s + a.balance, 0)

  // Correct bucket totals = unlinked account balances + holdings in that category
  const retirementTotal = unlinkedTotal('retirement') + (holdingsByCategory.retirement ?? 0)
  const taxableTotal    = unlinkedTotal('taxable')    + (holdingsByCategory.taxable    ?? 0)
  const insuranceTotal  = unlinkedTotal('insurance')  + (holdingsByCategory.insurance  ?? 0)
  const liquidityTotal  = unlinkedTotal('liquidity')  + (holdingsByCategory.liquidity  ?? 0)

  const totAssets = accounts.filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0) || 1

  const groups = CATEGORIES.map(c => ({
    key:   c.value,
    label: c.label,
    items: accounts.filter(a => (a.category ?? 'liquidity') === c.value),
    total: c.value === 'retirement' ? retirementTotal
         : c.value === 'taxable'    ? taxableTotal
         : c.value === 'insurance'  ? insuranceTotal
         : liquidityTotal,
    holdingsValue: holdingsByCategory[c.value] ?? 0,
  })).filter(g => g.items.length > 0 || g.holdingsValue > 0)

  function openAdd() {
    setForm({ name: '', category: 'retirement', type: '', balance: '' })
    setModal({ mode: 'add' })
  }

  function openEdit(a: Account) {
    setForm({ name: a.name, category: a.category ?? 'liquidity', type: a.type, balance: String(a.balance) })
    setModal({ mode: 'edit', account: a })
  }

  async function handleSave() {
    setSaving(true)
    const code = (form.name || 'AC').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AC'
    const entry = {
      code,
      name:     form.name || 'Account',
      type:     form.type || '—',
      balance:  parseFloat(form.balance) || 0,
      category: (form.category || 'liquidity') as AccountCategory,
      user_id:  userId,
    }
    if (modal?.mode === 'edit' && modal.account) {
      await supabase.from('accounts').update(entry).eq('id', modal.account.id)
    } else {
      await supabase.from('accounts').insert(entry)
    }
    setSaving(false)
    setModal(null)
    router.refresh()
    const { data } = await supabase.from('accounts').select('*').eq('user_id', userId)
    if (data) setAccounts(data as Account[])
  }

  async function handleDelete(id: string) {
    await supabase.from('accounts').delete().eq('id', id)
    setAccounts(prev => prev.filter(a => a.id !== id))
  }

  const kpis = [
    {
      label: 'Retirement Assets',
      value: fmt(retirementTotal),
      sub: holdingsByCategory.retirement
        ? `Incl. ${fmt(holdingsByCategory.retirement)} in holdings`
        : '401(k) · IRA · HSA',
    },
    {
      label: 'Taxable Investments',
      value: fmt(taxableTotal),
      sub: holdingsByCategory.taxable
        ? `Incl. ${fmt(holdingsByCategory.taxable)} in holdings`
        : 'Brokerage accounts',
    },
    { label: 'Real Estate Equity', value: fmt(reEquity),       sub: 'Property value − mortgage' },
    { label: 'Insurance / IUL',    value: fmt(insuranceTotal), sub: 'Cash value' },
    { label: 'Liquidity',          value: fmt(liquidityTotal), sub: 'Cash + emergency fund' },
  ]

  return (
    <>
      {/* ── KPI cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 22 }}>
        {kpis.map(k => (
          <div className="card" key={k.label}>
            <div className="klabel">{k.label}</div>
            <div className="head kval" style={{ fontSize: 26, marginTop: 6 }}>{k.value}</div>
            <div className="subtle" style={{ marginTop: 4, fontSize: 12 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Grouped table ── */}
      <div className="card">
        <div className="rowbtwn" style={{ marginBottom: 8 }}>
          <span className="cardtitle">All accounts</span>
          <button className="btn" onClick={openAdd}>+ Add account</button>
        </div>

        {accounts.length === 0 ? (
          <p className="empty">No accounts yet — add one to get started.</p>
        ) : (
          <table className="tbl" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '36%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '6%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Account</th>
                <th>Type</th>
                <th className="rt">Allocation</th>
                <th className="rt">Balance</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {groups.map(grp => (
                <>
                  <tr key={`hdr-${grp.key}`}>
                    <td colSpan={5} style={{ padding: '16px 0 6px' }}>
                      <div className="rowbtwn">
                        <span className="cardtitle" style={{ fontSize: 13 }}>{grp.label}</span>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>
                          {fmt(grp.total)}
                          {grp.holdingsValue > 0 && (
                            <span className="subtle" style={{ fontSize: 11, fontWeight: 400, marginLeft: 6 }}>
                              (incl. {fmt(grp.holdingsValue)} holdings)
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {grp.items.map(a => {
                    const isLinked     = linkedAccountIds.has(a.id)
                    const holdingsVal  = holdingsByAccountId[a.id] ?? 0
                    const diff         = Math.abs(a.balance - holdingsVal)
                    const showRecon    = isLinked && diff > 50  // warn if off by more than $50
                    const pct          = Math.round(Math.abs(a.balance) / totAssets * 100)
                    return (
                      <tr key={a.id} style={isLinked ? { opacity: 0.65 } : {}}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className="acctic">{a.code}</div>
                            <div>
                              <span style={{ fontWeight: 600 }}>{a.name}</span>
                              {isLinked && (
                                <div style={{ fontSize: 11, color: '#9a6c3e', marginTop: 1 }}>
                                  ↳ balance excluded — holdings are source of truth ({fmt(holdingsVal)})
                                </div>
                              )}
                              {showRecon && (
                                <div style={{ fontSize: 11, color: '#c0612b', marginTop: 1 }}>
                                  ⚠ Account balance ({fmt(a.balance)}) differs from holdings by {fmt(diff)} — update holdings or account balance
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="mut">{a.type}</td>
                        <td className="rt">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
                            <div className="track" style={{ width: 120 }}>
                              <div className="fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="mut" style={{ fontSize: 12.5, width: 34 }}>{pct}%</span>
                          </div>
                        </td>
                        <td className="rt" style={{ fontWeight: 700, color: a.balance < 0 ? 'var(--accent)' : 'inherit' }}>
                          {fmt(a.balance)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                            <button className="delx" onClick={() => openEdit(a)}>✎</button>
                            <button className="delx" onClick={() => handleDelete(a.id)}>×</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="rowbtwn" style={{ marginBottom: 20 }}>
              <span className="head" style={{ fontSize: 20, fontWeight: 700 }}>
                {modal.mode === 'add' ? 'Add account' : 'Edit account'}
              </span>
              <button className="delx" onClick={() => setModal(null)} style={{ fontSize: 20 }}>×</button>
            </div>

            <div className="field">
              <label>Account name</label>
              <input className="inp" type="text" placeholder="e.g. Fidelity 401(k)"
                value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="field">
              <label>Category</label>
              <select className="inp" value={form.category ?? 'retirement'}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Type</label>
              <input className="inp" type="text" placeholder="e.g. 401K, Roth IRA, HSA"
                value={form.type ?? ''} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} />
            </div>

            <div className="field">
              <label>Balance ($)</label>
              <input className="inp" type="number" step="0.01" placeholder="0"
                value={form.balance ?? ''} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button className="btn ghost" onClick={() => setModal(null)} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              <button className="btn" onClick={handleSave} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
                {saving ? 'Saving…' : 'Save entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
