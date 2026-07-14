'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Holding } from '@/types'

type FieldDef = { key: string; label: string; placeholder?: string; type?: string; step?: string }

const FIELDS: FieldDef[] = [
  { key: 'ticker',           label: 'Ticker',                        placeholder: 'e.g. SCHD' },
  { key: 'name',             label: 'Name',                          placeholder: 'e.g. Schwab US Dividend' },
  { key: 'shares',           label: 'Shares',                        placeholder: '0', type: 'number', step: '0.001' },
  { key: 'cost_basis',       label: 'Cost per share ($)',             placeholder: '0', type: 'number', step: '0.01' },
  { key: 'current_value',    label: 'Current price per share ($)',    placeholder: '0', type: 'number', step: '0.01' },
  { key: 'annual_dividends', label: 'Annual dividend per share ($)',  placeholder: '0', type: 'number', step: '0.0001' },
  { key: 'yield_on_cost',    label: 'Yield on cost (%)',              placeholder: '0', type: 'number', step: '0.01' },
]

function fmt(n: number) {
  return '$' + Math.abs(Math.round(n)).toLocaleString('en-US')
}

function fmtPrice(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type AccountOption = { id: string; name: string; category: string }
type Props = { holdings: Holding[]; accounts: AccountOption[]; userId: string }

export default function DividendsClient({ holdings: initial, accounts, userId }: Props) {
  const [holdings, setHoldings] = useState(initial)
  const [modal, setModal] = useState<null | { mode: 'add' | 'edit'; holding?: Holding }>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [linkedAccountId, setLinkedAccountId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // All per-share values × shares for totals
  const divTotal   = holdings.reduce((s, h) => s + h.shares * h.annual_dividends, 0)
  const portValue  = holdings.reduce((s, h) => s + h.shares * h.current_value, 0)
  const portCost   = holdings.reduce((s, h) => s + h.shares * h.cost_basis, 0)
  const yocAvg     = portCost > 0 ? (divTotal / portCost * 100) : 0
  const dripCount  = holdings.filter(h => h.drip).length

  function openAdd() {
    setForm({ ticker: '', name: '', shares: '', cost_basis: '', current_value: '', annual_dividends: '', yield_on_cost: '' })
    setLinkedAccountId('')
    setModal({ mode: 'add' })
  }

  function openEdit(h: Holding) {
    setForm({
      ticker: h.ticker, name: h.name, shares: String(h.shares),
      cost_basis: String(h.cost_basis), current_value: String(h.current_value),
      annual_dividends: String(h.annual_dividends), yield_on_cost: String(h.yield_on_cost),
    })
    setLinkedAccountId(h.account_id ?? '')
    setModal({ mode: 'edit', holding: h })
  }

  async function handleSave() {
    setSaving(true)
    const n = (k: string) => parseFloat(form[k]) || 0
    const entry = {
      ticker: (form.ticker || 'NEW').toUpperCase(),
      name: form.name || '—',
      shares: n('shares'), cost_basis: n('cost_basis'), current_value: n('current_value'),
      annual_dividends: n('annual_dividends'), yield_on_cost: n('yield_on_cost'),
      drip: modal?.mode === 'edit' ? (modal.holding?.drip ?? false) : false,
      account_id: linkedAccountId || null,
      user_id: userId,
    }
    if (modal?.mode === 'edit' && modal.holding) {
      await supabase.from('holdings').update(entry).eq('id', modal.holding.id)
    } else {
      await supabase.from('holdings').insert(entry)
    }
    setSaving(false)
    setModal(null)
    router.refresh()
    const { data } = await supabase.from('holdings').select('*').eq('user_id', userId)
    if (data) setHoldings(data as Holding[])
  }

  async function handleDelete(id: string) {
    await supabase.from('holdings').delete().eq('id', id)
    setHoldings(prev => prev.filter(h => h.id !== id))
  }

  async function toggleDrip(h: Holding) {
    await supabase.from('holdings').update({ drip: !h.drip }).eq('id', h.id)
    setHoldings(prev => prev.map(x => x.id === h.id ? { ...x, drip: !x.drip } : x))
  }

  return (
    <>
      {/* KPI cards */}
      <div className="grid4" style={{ marginBottom: 22 }}>
        {[
          { label: 'Annual income',       value: fmt(divTotal),       sub: `$${Math.round(divTotal / 12).toLocaleString()}/mo` },
          { label: 'Dividend portfolio value', value: fmt(portValue), sub: `Incl. retirement & taxable · Gain: ${fmt(portValue - portCost)}` },
          { label: 'Weighted YOC',        value: yocAvg.toFixed(1) + '%', sub: 'Yield on cost' },
          { label: 'DRIP enabled',        value: String(dripCount),   sub: `of ${holdings.length} holdings` },
        ].map(k => (
          <div className="card" key={k.label}>
            <div className="klabel">{k.label}</div>
            <div className="head kval" style={{ fontSize: 28, marginTop: 8 }}>{k.value}</div>
            <div className="subtle" style={{ marginTop: 6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Holdings table */}
      <div className="card">
        <div className="rowbtwn" style={{ marginBottom: 18 }}>
          <span className="cardtitle">Holdings</span>
          <button className="btn" onClick={openAdd}>+ Add holding</button>
        </div>

        {holdings.length === 0 ? (
          <p className="empty">No holdings yet — add one to track your dividends.</p>
        ) : (
          <table className="tbl" style={{ tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: '27%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '6%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Ticker</th>
                <th className="rt">Shares</th>
                <th className="rt">Cost basis</th>
                <th className="rt">Price</th>
                <th className="rt">Value</th>
                <th className="rt">Annual divs</th>
                <th className="rt">YOC</th>
                <th className="rt">DRIP</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {holdings.map(h => (
                <tr key={h.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                      <div className="acctic" style={{ fontSize: 10, flexShrink: 0 }}>{h.ticker.slice(0, 4)}</div>
                      <div style={{ overflow: 'hidden' }}>
                        <div className="tkr">{h.ticker}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="subtle" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</div>
                          {h.account_id && (() => {
                            const acct = accounts.find(a => a.id === h.account_id)
                            return acct ? (
                              <span style={{ fontSize: 10, background: '#f0e8da', color: '#9a6c3e', borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                {acct.name}
                              </span>
                            ) : null
                          })()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="rt">{h.shares.toLocaleString()}</td>
                  <td className="rt">{fmt(h.shares * h.cost_basis)}</td>
                  <td className="rt">{fmtPrice(h.current_value)}</td>
                  <td className="rt" style={{ fontWeight: 600 }}>{fmt(h.shares * h.current_value)}</td>
                  <td className="rt acc" style={{ fontWeight: 700 }}>
                    {fmt(h.shares * h.annual_dividends)}
                    {h.current_value > 0 && (h.annual_dividends / h.current_value) > 0.5 && (
                      <span title="Implied yield > 50% — verify annual dividend is entered per share, not as a total" style={{ marginLeft: 4, cursor: 'help', color: '#c0612b' }}>⚠</span>
                    )}
                  </td>
                  <td className="rt">{h.yield_on_cost.toFixed(1)}%</td>
                  <td className="rt">
                    <div
                      className={`toggle${h.drip ? ' on' : ''}`}
                      onClick={() => toggleDrip(h)}
                      title={h.drip ? 'DRIP on — click to disable' : 'DRIP off — click to enable'}
                    >
                      <b />
                    </div>
                  </td>
                  <td className="rt">
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="delx" onClick={() => openEdit(h)}>✎</button>
                      <button className="delx" onClick={() => handleDelete(h.id)}>×</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="cardtitle" style={{ marginBottom: 20 }}>
              {modal.mode === 'add' ? 'Add holding' : 'Edit holding'}
            </div>

            {FIELDS.map(field => {
              const shares   = parseFloat(form.shares) || 0
              const perShare = parseFloat(form[field.key]) || 0
              const total    = shares * perShare
              const showPreview = ['cost_basis', 'current_value', 'annual_dividends'].includes(field.key) && shares > 0 && perShare > 0
              const impliedYield = field.key === 'annual_dividends' && parseFloat(form.current_value) > 0
                ? (perShare / parseFloat(form.current_value)) * 100
                : null

              return (
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
                  {showPreview && (
                    <div style={{ fontSize: 11, color: impliedYield && impliedYield > 50 ? '#c0612b' : '#9a6c3e', marginTop: 4 }}>
                      = {fmt(total)} total
                      {impliedYield !== null && ` · ${impliedYield.toFixed(1)}% yield`}
                      {impliedYield !== null && impliedYield > 50 && ' ⚠ — is this per share or total?'}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Account link */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9a8a78', marginBottom: 6 }}>
                Linked account <span style={{ fontWeight: 400, color: '#b3a794' }}>(optional — avoids double-counting)</span>
              </label>
              <select
                className="inp"
                value={linkedAccountId}
                onChange={e => setLinkedAccountId(e.target.value)}
              >
                <option value="">— No account link —</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

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
