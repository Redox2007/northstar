import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { Account, Holding } from '@/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  // Compute sidebar KPIs server-side
  const [{ data: accounts }, { data: holdings }] = await Promise.all([
    supabase.from('accounts').select('*').eq('user_id', user.id),
    supabase.from('holdings').select('*').eq('user_id', user.id),
  ])

  const accs = (accounts as Account[]) ?? []
  const hlds = (holdings as Holding[]) ?? []

  // Accounts linked to holdings are excluded — holdings value is the source of truth
  const linkedAccountIds = new Set(hlds.map(h => h.account_id).filter(Boolean))
  const investedAssets = accs
    .filter(a => a.balance > 0 && !linkedAccountIds.has(a.id) &&
      (a.category === 'retirement' || a.category === 'taxable'))
    .reduce((s, a) => s + a.balance, 0)

  // Add dividend portfolio value (shares × price per share)
  const portValue = hlds.reduce((s, h) => s + h.shares * h.current_value, 0)
  const totalInvested = investedAssets + portValue

  const invested500kPct = (totalInvested / 500000) * 100
  const investedStr = '$' + Math.round(totalInvested / 1000) + 'k'

  const userName = user.email?.split('@')[0] ?? 'You'

  return (
    <div className="ffapp">
      <Sidebar
        investedPct={invested500kPct}
        investedStr={investedStr}
        userName={userName}
      />
      <div className="main">
        {children}
      </div>
    </div>
  )
}
