import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Account, Holding } from '@/types'
import DividendsClient from './DividendsClient'
import { MarketStatusPill } from '@/components/MarketStatusPill'

export default async function DividendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [{ data: holdings }, { data: accounts }] = await Promise.all([
    supabase.from('holdings').select('*').eq('user_id', user.id).order('annual_dividends', { ascending: false }),
    supabase.from('accounts').select('id,name,category').eq('user_id', user.id).order('name'),
  ])

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Passive income</div>
          <div className="h2">Dividend tracker</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <MarketStatusPill />
          <div className="avatar">{(user.email ?? 'U').charAt(0).toUpperCase()}</div>
        </div>
      </div>
      <div className="body">
        <DividendsClient
          holdings={(holdings as Holding[]) ?? []}
          accounts={(accounts as Pick<Account, 'id' | 'name' | 'category'>[]) ?? []}
          userId={user.id}
        />
      </div>
    </>
  )
}
