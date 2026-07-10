'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/dashboard',   label: 'Dashboard' },
  { href: '/accounts',    label: 'Accounts' },
  { href: '/dividends',   label: 'Dividends' },
  { href: '/real-estate', label: 'Real Estate' },
  { href: '/debt',        label: 'Debt' },
  { href: '/fire',        label: 'FIRE Calculator' },
  { href: '/goals',       label: 'Goals' },
]

type SidebarProps = {
  investedPct: number
  investedStr: string
  nextGoalLabel: string
  nextGoalStr: string
  userName: string
}

export default function Sidebar({ investedPct, investedStr, nextGoalLabel, nextGoalStr, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  const pct = Math.min(100, Math.round(investedPct))

  return (
    <aside className="sb">
      <div className="brandrow">
        <div className="brandmark">◆</div>
        <span className="brandname">Northstar</span>
      </div>

      <nav className="nav">
        {NAV.map(n => (
          <Link
            key={n.href}
            href={n.href}
            className={`navi${pathname === n.href ? ' on' : ''}`}
          >
            <span className="navdot" />
            {n.label}
          </Link>
        ))}
      </nav>

      {/* Next milestone card */}
      <div className="sbcard" style={{ marginTop: 'auto' }}>
        <div style={{ fontSize: 12.5, color: '#b3a794', marginBottom: 6 }}>Next milestone</div>
        <div className="head" style={{ fontSize: 19, color: '#fbf6ee', lineHeight: 1.3 }}>{nextGoalLabel}</div>
        <div className="track" style={{ marginTop: 12, background: '#5a4c3b' }}>
          <div className="fillamb" style={{ width: `${pct}%` }} />
        </div>
        <div style={{ fontSize: 12, color: '#b3a794', marginTop: 8 }}>
          {investedStr} of {nextGoalStr} · {pct}%
        </div>
      </div>

      {/* User / Sign out */}
      <button
        onClick={signOut}
        style={{
          marginTop: 16, background: 'none', border: 'none', cursor: 'pointer',
          color: '#9a8a78', fontSize: 13, display: 'flex', alignItems: 'center',
          gap: 8, padding: '4px 10px',
        }}
      >
        <span style={{ fontSize: 16 }}>↩</span>
        Sign out {userName}
      </button>
    </aside>
  )
}
