'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f4ece2',
      fontFamily: "'Work Sans', sans-serif",
      color: '#33291f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '64px 20px',
    }}>
      {/* Brand row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 34 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, background: '#c26a45',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 16,
        }}>◆</div>
        <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.2px', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
          Northstar
        </span>
      </div>

      {/* Card */}
      <div style={{
        width: 380, maxWidth: '100%',
        background: '#fffaf3',
        border: '1px solid #eaddcc',
        borderRadius: 20,
        padding: 32,
      }}>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: '-0.3px', margin: '0 0 6px' }}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p style={{ color: '#9a8a78', fontSize: 14, margin: '0 0 26px' }}>
          {mode === 'login' ? 'Sign in to your Northstar account' : 'Start tracking your path to freedom'}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#a08d76', marginBottom: 7 }}>Email</label>
            <input
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1px solid #eaddcc', background: '#fff',
                fontSize: 14, fontFamily: "'Work Sans', sans-serif", color: '#33291f',
                outline: 'none', boxSizing: 'border-box',
              }}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#a08d76', marginBottom: 7 }}>Password</label>
            <input
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1px solid #eaddcc', background: '#fff',
                fontSize: 14, fontFamily: "'Work Sans', sans-serif", color: '#33291f',
                outline: 'none', boxSizing: 'border-box',
              }}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p style={{ color: '#c26a45', fontSize: 13, marginBottom: 16 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: 13, borderRadius: 10,
              background: '#c26a45', color: '#fff',
              fontSize: 14.5, fontWeight: 700, border: 'none', cursor: 'pointer',
              fontFamily: "'Work Sans', sans-serif", marginTop: 6,
            }}
          >
            {loading ? 'Loading…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13.5, color: '#9a8a78' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            style={{ color: '#c26a45', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13.5 }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
