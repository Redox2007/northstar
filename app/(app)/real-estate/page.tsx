import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Property } from '@/types'
import RealEstateClient from './RealEstateClient'
import { Suspense } from 'react'
import { MarketStatusPill } from '@/components/MarketStatusPill'

export default async function RealEstatePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: properties } = await supabase
    .from('properties').select('*').eq('user_id', user.id).order('value', { ascending: false })

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Rental portfolio</div>
          <div className="h2">Real estate</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Suspense fallback={<div className="pill">● Loading...</div>}>
  <MarketStatusPill />
</Suspense>
          <div className="avatar">{(user.email ?? 'U').charAt(0).toUpperCase()}</div>
        </div>
      </div>
      <div className="body">
        <RealEstateClient properties={(properties as Property[]) ?? []} userId={user.id} />
      </div>
    </>
  )
}
