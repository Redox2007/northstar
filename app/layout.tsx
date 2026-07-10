import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Northstar — Financial Freedom Tracker',
  description: 'Track your journey to FIRE and financial independence',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
