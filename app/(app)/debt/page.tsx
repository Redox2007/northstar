import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Debt } from '@/types'
import DebtClient from './DebtClient'
import { Suspense } from 'react'
import { MarketStatusPill } from '@/components/MarketStatusPill'

export default async function DebtPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: debts } = await supabase
    .from('debts').select('*').eq('user_id', user.id)

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Payoff plan</div>
          <div className="h2">Debt tracker</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Suspense fallback={<div className="pill">● Loading...</div>}>
              <MarketStatusPill />
            </Suspense>
          </Suspense>
          <div className="avatar">{(user.email ?? 'U').charAt(0).toUpperCase()}</div>
        </div>
      </div>
      <div className="body">
        <DebtClient debts={(debts as Debt[]) ?? []} userId={user.id} />
      </div>
    </>
  )
}
