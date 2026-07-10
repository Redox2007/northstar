# Northstar — Setup Guide

## Stack
- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Charts:** Recharts
- **Backend / DB / Auth:** Supabase (PostgreSQL + Supabase Auth)
- **Hosting:** Vercel

---

## 1. Supabase setup

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In the SQL Editor, paste and run the contents of `supabase/migrations/001_init.sql`.  
   This creates all tables with Row Level Security enabled.
3. In **Project Settings → API**, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 2. Local development

```bash
# Clone / copy this project
cd northstar

# Install dependencies
npm install

# Create your env file
cp .env.example .env.local
# Fill in your Supabase URL and anon key

# Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/auth` to sign up.

---

## 3. Deploy to Vercel

1. Push to GitHub (or connect directly).
2. Import project in [vercel.com](https://vercel.com).
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. ✅

---

## 4. Supabase Auth settings

In your Supabase dashboard → **Authentication → URL Configuration**:
- **Site URL:** your Vercel domain (e.g. `https://northstar.vercel.app`)
- **Redirect URLs:** add your domain + `/auth/callback`

---

## App structure

```
northstar/
├── app/
│   ├── (app)/              ← Authenticated layout (sidebar + topbar)
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   ├── accounts/
│   │   ├── dividends/
│   │   ├── real-estate/
│   │   ├── debt/
│   │   ├── fire/
│   │   └── goals/
│   ├── auth/               ← Login / signup page
│   ├── globals.css         ← Design system (all CSS custom classes)
│   └── layout.tsx
├── components/
│   ├── Sidebar.tsx
│   └── Modal.tsx
├── lib/
│   └── supabase/
│       ├── client.ts       ← Browser client
│       └── server.ts       ← Server component client
├── types/
│   └── index.ts            ← TypeScript types for all entities
├── middleware.ts            ← Auth route protection
└── supabase/
    └── migrations/
        └── 001_init.sql    ← Run this in Supabase SQL editor
```

---

## Phase 2 roadmap (not yet built)

- **Phase 2:** Live stock prices + dividend data via a market data API (e.g. Polygon.io, Alpha Vantage)
- **Phase 3:** Plaid account linking + Zillow/Estated property valuation APIs
- **Phase 4:** AI monthly review — "what should I prioritize next?" powered by Claude
