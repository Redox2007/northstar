import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Account, Holding, Property, Debt } from '@/types'
import { computeFinancials } from '@/lib/financial-engine'
import AccountsClient from './AccountsClient'

export default async function AccountsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [
    { data: accounts },
    { data: holdings },
    { data: properties },
    { data: debts },
  ] = await Promise.all([
    supabase.from('accounts').select('*').eq('user_id', user.id).order('balance', { ascending: false }),
    supabase.from('holdings').select('*').eq('user_id', user.id),
    supabase.from('properties').select('value,mortgage_balance').eq('user_id', user.id),
    supabase.from('debts').select('*').eq('user_id', user.id),
  ])

  const accs  = (accounts   as Account[])  ?? []
  const hlds  = (holdings   as Holding[])  ?? []
  const props = (properties as Pick<Property, 'value' | 'mortgage_balance'>[]) ?? []

  const e = computeFinancials({
    accounts:   accs,
    holdings:   hlds,
    properties: props as Property[],
    debts:      (debts as Debt[]) ?? [],
    fire:       null,
  })

  // Per-account holdings value — for reconciliation warnings
  const holdingsByAccountId = hlds.reduce<Record<string, number>>((map, h) => {
    if (h.account_id) {
      map[h.account_id] = (map[h.account_id] ?? 0) + (h.shares ?? 0) * (h.current_value ?? 0)
    }
    return map
  }, {})

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Overview</div>
          <div className="h2">Accounts</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="pill">● All accounts synced</div>
          <div className="avatar">{(user.email ?? 'U').charAt(0).toUpperCase()}</div>
        </div>
      </div>
      <div className="body">
        <AccountsClient
          accounts={accs}
          userId={user.id}
          holdingsByCategory={e.holdingsByCategory}
          holdingsByAccountId={holdingsByAccountId}
          reEquity={e.reEquity}
        />
      </div>
    </>
  )
}
