# 02 — Supabase: authentication and data storage

## Goals
1. Every piece of user content is stored in Postgres or Storage, protected by row-level security (RLS). Nothing user-created stays only in localStorage.
2. Authentication is complete: sign up, sign in, sign out, password reset, email confirmation, Google sign-in, and an optional guest mode.
3. No secrets in the browser bundle. Only the URL and the anon key, which are public by design.
4. Existing users keep their current local data through a one-time import.

---

## A. Authentication

### Current state
- Email and password only (`signUp`, `signInWithPassword`), with `full_name` in user metadata.
- **Hard-coded demo credentials** (`judge12@gmail.com` / `judge123`) are shipped in [App.jsx](../src/App.jsx).
- No password reset, no OAuth, no profile table.

### Target
| Flow | Implementation |
|---|---|
| Sign up | `supabase.auth.signUp({ email, password, options: { data: { full_name }, emailRedirectTo: <origin>/auth/callback } })` |
| Email confirmation | On in the dashboard. The app shows a "check your inbox" screen and has a resend button (`auth.resend`). |
| Sign in | `signInWithPassword` |
| Google sign-in *(deferred to deploy)* | `signInWithOAuth({ provider: 'google', options: { redirectTo: <origin>/auth/callback } })` |
| Forgot password | `resetPasswordForEmail(email, { redirectTo: <origin>/auth/reset })` → reset page calls `updateUser({ password })` on the `PASSWORD_RECOVERY` event |
| Guest mode (optional) | `signInAnonymously()` creates a real user with RLS-protected data. Later it is upgraded with `updateUser({ email })` or `linkIdentity({ provider: 'google' })`, so nothing is lost. **This replaces the judge account.** |
| Sign out | `signOut()`, clears in-memory state and returns to the landing page |
| Session | One `AuthProvider` context: `getSession()` + `onAuthStateChange`. Routes are guarded by a `<RequireAuth>` wrapper. |
| Account settings | Change display name, email, password; delete account (Edge Function with the service role, phase 2, optional) |

SPA note: with PKCE the callback URL carries `?code=`. supabase-js `detectSessionInUrl` exchanges it automatically on load. The `/auth/callback` route only waits for the session and then redirects to `/home`.

### Remove
- `JUDGE_EMAIL` / `JUDGE_PASSWORD` constants and the "Try the demo workspace" button, which becomes **Continue as guest** if you choose guest mode.
- The judge account itself. You delete it in the dashboard once you confirm its data isn't needed.

---

## B. Data model

The full SQL is in [sql/0001_init.sql](sql/0001_init.sql). Summary:

| Table | Purpose | Notes |
|---|---|---|
| `profiles` | display name, currency (default `INR`), locale, week start, theme, timezone, `local_import_done_at` | A trigger creates the row on sign-up |
| `boards` | Sticker boards (more than one board per user) | `default_view`: matrix / free / list |
| `tasks` | Stickers (the existing table, extended) | Adds `board_id`, `is_important`, `is_urgent`, `color`, position/size/z, tags, notes, `remind_at`, recurrence, `completed_at`, `archived_at`, `updated_at` |
| `fin_accounts` | Cash, bank, card, wallet (UPI), loan | Balance = opening + transactions (derived) |
| `fin_categories` | User categories (expense/income) | Defaults are seeded on first use |
| `fin_transactions` | Expense, income, transfer | Links to account, category, optional goal, optional recurring rule |
| `fin_budgets` | Monthly limit per category (or overall) | Optional rollover |
| `fin_recurring` | Bills, subscriptions, salary, SIPs | `next_due_on`, cadence |
| `fin_goals` | Savings goals | Progress = sum of goal-linked transactions |
| `fin_holdings` | Mutual funds, stocks, FD, gold, EPF/PPF, crypto | Invested amount vs current value; SIP amount and day |
| `fin_holding_snapshots` | Value history | Feeds the net-worth chart |
| `documents` | Workspace documents | `content jsonb` (pages, blocks, ink) |
| `flows` | Flow diagrams | `scene jsonb` (nodes, edges, viewport) |
| `item_links` | Links between items in different tools (task ↔ flow node ↔ document) | Phase 6 |

Storage bucket **`workspace-assets`** (private): `{user_id}/{document_id}/{uuid}.{ext}`. Images are uploaded there, and blocks store only the path. Signed URLs are cached per session.

### Why JSONB for documents and flows
A document is loaded and saved as a whole, and its shape will change during the redesign. JSONB keeps that flexible, and it's still one row per document under RLS. Size guard: images live in Storage, never base64 in JSON.

### RLS pattern (every table)
```sql
alter table t enable row level security;
create policy "owner_all" on t for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create index on t (user_id);
```
Plus a shared `set_updated_at()` trigger. Cross-table integrity: foreign keys like `fin_transactions.account_id` must point to the same user's rows. That is enforced with a `check_same_owner` trigger on the finance tables (included in the SQL).

### Storage policies
```sql
-- read / insert / update / delete only inside own folder
using (bucket_id = 'workspace-assets' and (storage.foldername(name))[1] = (select auth.uid())::text)
```

---

## C. Client data layer

```
src/lib/supabase.js          createClient (single instance)
src/lib/auth/AuthProvider.jsx  session context, hooks: useAuth()
src/features/<tool>/api.js   all queries for that tool (pure async functions)
src/features/<tool>/use*.js  state hooks: load, optimistic update, debounced autosave
```
- **Autosave**: debounced (600–800 ms) `update ... set content = $1, updated_at = now()` with a "Saving / Saved / Offline — retrying" indicator.
- **Conflicts**: last write wins, using `updated_at`. If the server row is newer than the version that was loaded (another tab or device), show "This document changed elsewhere — reload / keep mine".
- **Offline**: unsaved changes are mirrored to localStorage as a crash buffer (`taskr_unsaved_<table>_<id>`). They are flushed on reconnect and cleared on success.
- Realtime sync between devices is not needed for v1. It can be added later with `supabase.channel` on documents and flows.

## D. One-time localStorage import
Runs after sign-in when `profiles.local_import_done_at is null`. **Sticker data is not imported**, because old tasks aren't needed and the `tasks` table starts fresh.

| localStorage key | → destination |
|---|---|
| `taskr_finance_transactions_<uid>` | `fin_transactions` in a default "Main account" whose opening balance makes the derived balance match the stored `taskr_finance_balance_<uid>` |
| `taskr_finance_budget_<uid>` | `fin_budgets` (overall, monthly) |
| `taskr_workspace_document_<uid>` | one `documents` row; base64 images uploaded to Storage, then replaced with paths |
| `taskr_flow_diagram_<uid>` | one `flows` row |
| `tasker_task_meta_*`, `taskr_sticker_layout_*`, `TASKR_ALERTS`, `taskr_saved_workspaces` | dropped |

After a successful import, the old keys are renamed `*_imported` (not deleted) as a safety net.

## E. Deployment (deferred until after the UI redesign)
TASKR runs on localhost only until the redesign is done. Then:
- Create the **prod** Supabase project and apply the same migrations to it (`supabase link` to prod → `supabase db push`).
- Add `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (prod values) as GitHub secrets and pass them as `env:` to the Firebase build step.
- Auth URL configuration on prod: Site URL = production URL; redirect URLs = production domain.
- Add Google sign-in, turn email confirmation on, and set up custom SMTP on prod.
- SPA rewrites in `firebase.json` already exist.

---

## F. Decisions (resolved 2026-10-10)

| # | Question | Decision |
|---|---|---|
| 1 | Projects | **Two.** The project in the current `.env` becomes **dev** (its data isn't needed). **Prod** is created at deploy time, after the redesign. |
| 2 | Keep existing `tasks` / judge data? | **No.** `tasks` is dropped and recreated; the judge account can be deleted from the dashboard. |
| 3 | Guest mode | **Yes.** "Continue as guest" (anonymous sign-in) replaces the demo login; a guest can later add an email or password and keep their data. |
| 4 | Google sign-in | **Later (at deploy).** It needs a Google Cloud OAuth client tied to the prod URL; for localhost-only use it adds setup without benefit. The code is written provider-ready, so enabling it is config plus one button. |
| 5 | Email confirmation | **Off in dev, on in prod.** With only you testing on localhost, confirmation emails add friction and hit the built-in sender's rate limit. The sign-up flow still handles the "check your email" case, so prod just flips the setting. |
| 6 | Currency | INR default, changeable per user in Settings. |
| 7 | Applying migrations | **Supabase CLI** (most efficient: versioned `supabase/migrations/` files, and the same files reapply to prod in one command). |
| 8 | Extra test users / SMTP | Not needed now. You add test users yourself when you want them. |
| 9 | GitHub secrets | You'll add them at deploy time. |

### Setup you do before Phase 1 (one time, about 5 minutes)
1. Install the CLI: `npm install -D supabase` (I can add it as a dev dependency during Phase 0, then you run it with `npx supabase`).
2. In the repo: `npx supabase login` (opens the browser), then `npx supabase link --project-ref <dev-project-ref>` (the ref is the subdomain in your `VITE_SUPABASE_URL`; it asks for the database password, which you type yourself).
3. Dashboard (dev project) → Authentication → Sign In / Providers:
   - **Allow anonymous sign-ins: ON**
   - **Confirm email: OFF**
4. Dashboard → Authentication → URL Configuration: Site URL `http://localhost:5173`, Redirect URLs `http://localhost:5173/**`.

After that I run `npx supabase db push` to apply the migrations. I never need the `service_role` key or the database password in chat.

Free-tier note: an inactive dev project pauses after about a week. You restore it from the dashboard; the data is kept.
