# 08 — Execution roadmap

Runs after you say **"execute"**. Each phase ends with `npm run build` passing, unit tests passing, a manual click-through in the browser, and a short report to you. Commits happen per phase on the `tables` branch (or a new `redefine` branch). Nothing is pushed until phase 7.

**Blocking inputs:** decisions are resolved ([02 §F](02-supabase-auth-and-data.md#f-decisions-resolved-2026-10-10)). Phase 1 only needs your 5-minute CLI and dashboard setup listed there. Phase 0 can start right away.

**Environment:** localhost only. No deploy until after the UI redesign; the prod Supabase project, Google sign-in, email confirmation, SMTP and GitHub secrets are all deferred to that point.

---

## Phase 0 — Foundation (no visual redesign)
1. Commit the current working tree (Table UI work + AI removal) as a checkpoint.
2. Delete dead files: `dashboard/DashboardSection`, `DotGrid`, `ProjectCard`, `ProjectGrid`, `WorkspaceHero`, `y/`, `public/TASKR - Copy.png`; untrack `tsconfig.tsbuildinfo` and the `graft/` cache (add both to `.gitignore`); remove `gsap`, `animejs`.
3. Add `react-router`; create `app/AppShell.jsx`, `app/routes.jsx`, lazy route per tool, error boundary per route.
4. Split `App.jsx`: auth screens → `features/auth/*`; sticker UI → `features/sticker/*`; shared modal → `components/ui/ConfirmDialog.jsx`; theme tokens → `lib/theme.js`.
5. `lib/supabase.js` (single client), `lib/auth/AuthProvider.jsx`, `RequireAuth`.
6. Persistent sidebar (replaces the hamburger drawer) + theme toggle wired to state.
7. Add `vitest` for pure-function tests (no UI test framework yet).
8. Add `supabase` CLI as a dev dependency; create `supabase/migrations/` (the old `supabase/schema.sql` moves into the first migration).

✅ Every tool still works exactly as before, now at its own URL; back/forward and refresh keep you on the same screen.

## Phase 1 — Supabase auth and data
1. Turn [sql/0001_init.sql](sql/0001_init.sql) into `supabase/migrations/<ts>_init.sql`; `npx supabase db push` to the **dev** project; check RLS by testing as two users (a guest and an email user: B can't read or write A's rows; signed-out requests get nothing).
2. Auth pages: sign in, sign up (+ check-your-email state for when confirmation is on), forgot/reset password, callback, **Continue as guest** + "save your account" upgrade (add email/password). Google written provider-ready but hidden until deploy. Remove the judge credentials.
3. `profiles` load/save; Settings page (name, currency, week start, theme).
4. `useAutosave` hook + save-status pill; localStorage crash buffer.
5. One-time **local import** (see 02 §D) with a summary toast ("Imported 42 transactions, 1 document, 1 flow").

✅ Sign up → sign in on two browsers → identical data. Password reset email arrives and works. Guest → upgrade keeps data.

## Phase 2 — Sticker ([04-sticker.md](04-sticker.md))
Boards → capture bar with parsing → matrix view → free board (DB positions) → list view → side-panel editor → complete/undo/recurring → filters in the URL → reminders → archive → daily review mode.
Tests: `parseCapture`, `quadrantOf`, `nextOccurrence`.

## Phase 3 — Finance ([05-finance.md](05-finance.md))
Accounts + seed → transactions (fast entry, edit, filters) → categories manager → budgets → bills/subscriptions (mark paid) → goals → investments + snapshots → overview (safe-to-spend, net worth) → CSV import/export → report print.
Tests: `netWorth`, `safeToSpend`, `goalMonthlyNeed`, `monthlyEquivalent`, `importHash`, CSV mapping.

## Phase 4 — Workspace ([06-workspace.md](06-workspace.md))
Documents list → cloud autosave + `migrateDocument` → Storage images (upload/paste/drop) → `perfect-freehand` ink + Excalidraw removal → Tiptap text boxes → table row/column ops → multi-select, align, snapping → page styles → history fix → PDF/PNG export → templates.
Tests: `migrateDocument`, stroke hit-test, history reducer.

## Phase 5 — Flow ([07-flow.md](07-flow.md))
Diagrams list → React Flow editor with custom nodes → handles and smoothstep edges → inspector → dagre "Tidy up" → templates on the new model → Mermaid import/export → exports → `migrateFlow` → remove the old editor.
Tests: `layout`, `mermaid.parse`/`serialise` round-trip, `migrateFlow`.

## Phase 6 — Cross-tool
Home "Today" dashboard → command palette (Ctrl/Cmd+K) → quick capture (Ctrl+Shift+N) → `item_links` (task ↔ document ↔ flow node) → keyboard shortcut sheet (`?`).

## Phase 7 — Ship
README rewrite (real feature list, setup, env vars, Supabase setup, scripts) → final build-size check → full manual QA pass on every acceptance check in files 04–07 → commit → **push the branch to GitHub**. Not merged to `main` yet: merging triggers the Firebase deploy workflow, and deploy waits until after the redesign.

## Phase 8 — UI redesign (separate plan, after the push)

## Phase 9 — Deploy (after the redesign)
Create the prod Supabase project → `db push` → enable Google, email confirmation and SMTP → GitHub secrets → merge to `main` (see 02 §E).

---

## Risks and mitigations
| Risk | Mitigation |
|---|---|
| Losing users' existing local data | Import is non-destructive (keys renamed, not deleted); a dry-run preview before import |
| The migration drops the old `tasks` table | Intended (data not needed); runs on the dev project only; prod starts clean at deploy |
| Tiptap and ink migration from old documents | Pure migration functions with tests on real saved samples (I'll copy your current localStorage docs as fixtures, with your OK) |
| Scope is large | Phases are independently shippable; each ends in a working app |
| Free tier pauses after 1 week of inactivity | Use a dev project for work; consider Pro before launch |
| Bundle growth from new libraries | Lazy routes; check build sizes each phase |

## Rough size
Phase 0: 1 session · Phase 1: 1–2 · Phase 2: 2 · Phase 3: 3 · Phase 4: 3 · Phase 5: 2 · Phase 6: 1–2 · Phase 7: 1.
