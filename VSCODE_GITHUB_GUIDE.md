# VSCode + GitHub: Step-by-Step Guide

This guide covers everything from opening the project in VSCode to pushing it live on GitHub and deploying to Vercel. No command-line experience required for most steps.

---

## Part 1 — One-time setup

### Step 1: Install the tools

| Tool | Download | Why |
|------|----------|-----|
| **VSCode** | [code.visualstudio.com](https://code.visualstudio.com) | Your code editor |
| **Node.js** (LTS) | [nodejs.org](https://nodejs.org) | Runs the Next.js dev server |
| **Git** | [git-scm.com](https://git-scm.com) | Version control (GitHub needs this) |

After installing, restart your computer once.

### Step 2: Recommended VSCode extensions

Open VSCode → click the **Extensions icon** (four squares, left sidebar) → search and install:

- **ESLint** — highlights code errors
- **Prettier** — auto-formats code on save
- **Tailwind CSS IntelliSense** — autocomplete for Tailwind classes
- **GitLens** — shows who changed what and when

### Step 3: Create a GitHub account

Go to [github.com](https://github.com) and sign up (free). Remember your username.

### Step 4: Sign into GitHub inside VSCode

1. Open VSCode
2. Click the **person icon** at the bottom-left corner
3. Click **Sign in with GitHub**
4. Follow the browser prompt to authorize VSCode

---

## Part 2 — Open the project

### Step 5: Move the project folder

Take the `northstar/` folder from your outputs and put it somewhere easy to find, like `~/Documents/northstar/`.

### Step 6: Open in VSCode

Option A — drag the `northstar/` folder onto the VSCode dock icon.  
Option B — in VSCode: **File → Open Folder…** → select the `northstar` folder.

You should see the file tree in the left sidebar.

### Step 7: Install dependencies

1. In VSCode, open the **Terminal**: `View → Terminal` (or `` Ctrl+` `` / `` Cmd+` ``)
2. Run:
   ```bash
   npm install
   ```
   Wait for it to finish (downloads ~200MB of packages into `node_modules/`).

### Step 8: Add your environment variables

1. In the file tree, find `.env.example`
2. Right-click → **Rename** → change to `.env.local`
3. Open it and fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```
   (Get these from Supabase dashboard → Project Settings → API)

### Step 9: Run the app locally

In the Terminal:
```bash
npm run dev
```
Open your browser to **http://localhost:3000** — you'll see the Northstar login page.

---

## Part 3 — Push to GitHub

### Step 10: Initialize a Git repository

In the Terminal (still in the `northstar/` folder):
```bash
git init
git add .
git commit -m "Initial commit — Northstar FIRE tracker"
```

You'll see a lot of green text — that's normal. It's tracking every file.

### Step 11: Create a new GitHub repository

1. Go to [github.com/new](https://github.com/new)
2. Name it `northstar` (or whatever you like)
3. Leave it **Private** (recommended — your financial data lives here)
4. **Do NOT** check "Add a README" (you already have one)
5. Click **Create repository**

### Step 12: Connect your local code to GitHub

GitHub will show you a page with commands. Copy and run the block that looks like this (your username will differ):

```bash
git remote add origin https://github.com/YOUR-USERNAME/northstar.git
git branch -M main
git push -u origin main
```

Paste each line into the VSCode Terminal and press Enter. You may be asked to sign in — use your GitHub credentials.

### Step 13: Verify it worked

Go to `github.com/YOUR-USERNAME/northstar` — you should see all your files there.

---

## Part 4 — Make changes and push updates

This is the everyday workflow once the project is on GitHub:

### The 3-step update loop

Every time you edit a file and want to save it to GitHub:

```bash
# 1. Stage the changes you made
git add .

# 2. Write a short message describing what you changed
git commit -m "Update dashboard freedom score formula"

# 3. Push to GitHub
git push
```

Or use the **VSCode shortcut** (no typing needed):

1. Click the **Source Control icon** in the left sidebar (looks like a branching line, or `Ctrl+Shift+G`)
2. You'll see a list of changed files
3. Type a message in the box at the top (e.g. "Update accounts page")
4. Click the **✓ Commit** button
5. Click **Sync Changes** (the circular arrows) to push to GitHub

---

## Part 5 — Deploy to Vercel

### Step 14: Connect Vercel to GitHub

1. Go to [vercel.com](https://vercel.com) and sign up with your **GitHub account**
2. Click **Add New → Project**
3. Find `northstar` in the list → click **Import**
4. Vercel detects it's a Next.js app automatically

### Step 15: Add environment variables in Vercel

Before clicking Deploy, expand **Environment Variables** and add:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon key |

### Step 16: Deploy

Click **Deploy**. Vercel builds and publishes your app in ~2 minutes.

You get a live URL like `northstar-abc123.vercel.app`. Share it or use it yourself.

### Step 17: Auto-deploy on every push

From now on, every time you `git push`, Vercel automatically rebuilds and redeploys your app. No extra steps needed.

---

## Part 6 — Supabase setup (manual steps, unchanged)

These steps still need to be done manually in the Supabase dashboard:

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste and run `supabase/migrations/001_init.sql`
3. Then run `supabase/migrations/002_updates.sql`
4. In **Authentication → URL Configuration**, add your Vercel domain as the Site URL
5. Copy the Project URL and anon key into Vercel's environment variables (done in Step 15)

---

## Quick reference cheatsheet

| Task | Command / Action |
|------|-----------------|
| Start local dev server | `npm run dev` |
| Stop the server | `Ctrl+C` in terminal |
| Stage all changes | `git add .` |
| Save a snapshot | `git commit -m "your message"` |
| Push to GitHub | `git push` |
| Pull latest from GitHub | `git pull` |
| Check what's changed | `git status` |
| See change history | `git log --oneline` |

---

## Common issues

**"command not found: npm"** → Node.js isn't installed. Download it from nodejs.org and try again.

**"remote origin already exists"** → Run `git remote remove origin` then redo Step 12.

**The page loads but shows an error about Supabase** → Double-check `.env.local` has the correct URL and key, with no extra spaces.

**Vercel deploy fails** → Check the build log in Vercel dashboard. Usually a missing environment variable.
