import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Account, Holding, Property, Debt, FireSettings, AllocationTargets } from '@/types'
import { computeFinancials } from '@/lib/financial-engine'
import { computeAllocation } from '@/lib/allocation'
import AllocationClient from './AllocationClient'
import { Suspense } from 'react'
import { MarketStatusPill } from '@/components/MarketStatusPill'

export default async function AllocationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [
    { data: accounts },
    { data: holdings },
    { data: properties },
    { data: debts },
    { data: fireRow },
    { data: targetsRow },
  ] = await Promise.all([
    supabase.from('accounts').select('*').eq('user_id', user.id),
    supabase.from('holdings').select('*').eq('user_id', user.id),
    supabase.from('properties').select('*').eq('user_id', user.id),
    supabase.from('debts').select('*').eq('user_id', user.id),
    supabase.from('fire_settings').select('*').eq('user_id', user.id).single(),
    supabase.from('allocation_targets').select('*').eq('user_id', user.id).single(),
  ])

  const e = computeFinancials({
    accounts:   (accounts   as Account[])   ?? [],
    holdings:   (holdings   as Holding[])   ?? [],
    properties: (properties as Property[])  ?? [],
    debts:      (debts      as Debt[])      ?? [],
    fire:       fireRow as FireSettings | null,
  })

  const { buckets, grossAssets } = computeAllocation(
    (accounts as Account[]) ?? [],
    (holdings as Holding[]) ?? [],
    e.reEquity,
    e.insuranceTotal,
  )

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Portfolio composition</div>
          <div className="h2">Asset allocation</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Suspense fallback={<div className="pill">● Loading...</div>}>
            <MarketStatusPill />
          </Suspense>
          <div className="avatar">{(user.email ?? 'U').charAt(0).toUpperCase()}</div>
        </div>
      </div>

      <div className="body">
        <AllocationClient
          buckets={buckets}
          grossAssets={grossAssets}
          targets={targetsRow as AllocationTargets | null}
          userId={user.id}
        />
      </div>
    </>
  )
}
