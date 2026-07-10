import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Account, Holding, Property } from '@/types'
import AccountsClient from './AccountsClient'

export default async function AccountsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [
    { data: accounts },
    { data: holdings },
    { data: properties },
  ] = await Promise.all([
    supabase.from('accounts').select('*').eq('user_id', user.id).order('balance', { ascending: false }),
    supabase.from('holdings').select('shares,current_value,account_id').eq('user_id', user.id),
    supabase.from('properties').select('value,mortgage_balance').eq('user_id', user.id),
  ])

  const hlds  = (holdings   as Pick<Holding,  'shares' | 'current_value' | 'account_id'>[]) ?? []
  const props = (properties as Pick<Property, 'value' | 'mortgage_balance'>[]) ?? []

  // These two values make the accounts page consistent with the dashboard
  const linkedAccountIds = new Set(hlds.map(h => h.account_id).filter(Boolean))
  const portValue = hlds.reduce((s, h) => s + (h.shares ?? 0) * (h.current_value ?? 0), 0)
  const reEquity  = props.reduce((s, p) => s + (p.value - p.mortgage_balance), 0)

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
          accounts={(accounts as Account[]) ?? []}
          userId={user.id}
          portValue={portValue}
          reEquity={reEquity}
          linkedAccountIds={Array.from(linkedAccountIds) as string[]}
        />
      </div>
    </>
  )
}
