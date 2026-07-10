import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Account, FireSettings, Holding, Property, Debt } from '@/types'
import { computeFinancials } from '@/lib/financial-engine'
import FireClient from './FireClient'

export default async function FirePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [
    { data: fireRow },
    { data: holdings },
    { data: properties },
    { data: accounts },
    { data: debts },
  ] = await Promise.all([
    supabase.from('fire_settings').select('*').eq('user_id', user.id).single(),
    supabase.from('holdings').select('*').eq('user_id', user.id),
    supabase.from('properties').select('*').eq('user_id', user.id),
    supabase.from('accounts').select('*').eq('user_id', user.id),
    supabase.from('debts').select('*').eq('user_id', user.id),
  ])

  const fire = fireRow as FireSettings | null

  const e = computeFinancials({
    accounts:   (accounts   as Account[])   ?? [],
    holdings:   (holdings   as Holding[])   ?? [],
    properties: (properties as Property[])  ?? [],
    debts:      (debts      as Debt[])      ?? [],
    fire,
  })

  const { passiveMonthly, totalInvested, rentalEquity } = e

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Scenario modeling</div>
          <div className="h2">FIRE calculator</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="pill">● All accounts synced</div>
          <div className="avatar">{(user.email ?? 'U').charAt(0).toUpperCase()}</div>
        </div>
      </div>
      <div className="body">
        <FireClient
          settings={fire}
          userId={user.id}
          passiveMonthly={passiveMonthly}
          totalInvested={Math.round(totalInvested + rentalEquity)}
        />
      </div>
    </>
  )
}
