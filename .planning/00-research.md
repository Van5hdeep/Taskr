# 00 — Research findings

Scope: what comparable products do, what users value, and which libraries and techniques fit TASKR.
Caveat: most web sources are vendor blogs or review roundups. I treated them as signals of what the market expects, not as hard data.

---

## 1. Sticker (task capture and prioritisation)

**What the market does**
- Eisenhower-matrix apps share a few basics: drag-and-drop quadrant boards, separate *urgency* and *importance* fields, a recommended action per quadrant (Do / Schedule / Delegate / Delete), and a switch between board and list views (Asana).
- Whiteboard tools (Vibe, Miro, FigJam) treat stickers as free objects. They offer colour coding, grouping/clustering, bulk actions, timers and voting. FigJam wins on simplicity, with a bottom toolbar that keeps tools in reach. Miro is more powerful but feels cluttered.
- Phone task apps add reminders, recurring tasks, cloud sync and widgets.

**Practitioner best practices**
- Brain-dump first, sort later. Capture has to be instant.
- Judge *importance* before urgency.
- Cap each quadrant at a handful of tasks.
- Review daily or weekly. The common complaint is that keeping the matrix up to date takes discipline, so the app should make review cheap.

**What this means for TASKR**
- The current board stores `urgency_score = 5` for every task, so priority does nothing. Urgency and importance need to become real fields that the quadrant position sets.
- Free-board stickers and the matrix are the same data shown two ways. A user should be able to switch views without losing their layout.
- Auto-deleting a task 24 hours after its deadline destroys data. It should be replaced with an Overdue state and an archive.

## 2. Finance

**What the market does (2026 reviews: NerdWallet, CNBC, Forbes, Quicken, Rob Berger)**
- The market is converging on one app that covers budgeting, savings goals, net worth and investments together.
- Savings goals are standard. YNAB calculates how much you need to save each month. Simplifi and PocketGuard set goal money aside before showing "safe to spend".
- Net worth tracking is a key differentiator: all asset types (bank, investments, retirement, property, vehicles) minus liabilities.
- There are two budgeting styles. Category/flex budgets (Monarch) and zero-based "give every dollar a job" (YNAB, EveryDollar). Recurring but irregular costs (quarterly, yearly) are a known pain point.
- Other common features: bills and subscription tracking, spending insights, and shared or split expenses (Monarch, Splitwise).

**India-specific (2026 roundups)**
- Users care about UPI spends, SIPs and mutual funds, EPF/PPF, EMIs and split expenses (Splitwise).
- Automatic SMS parsing is the top time-saver on Android. A web app can't read SMS, and it raises privacy concerns anyway. The web equivalent is **CSV import of bank statements** plus **fast manual entry** and **recurring templates**.
- Privacy-first, no-bank-linking positioning is used as a selling point (Pocket Clear).

**What this means for TASKR**
- The current balance is stored separately from transactions, so the two drift apart. Balances should be derived from accounts and transactions.
- Add accounts, recurring bills and subscriptions, per-category budgets, savings goals, holdings/SIPs and a net-worth view.
- Stand-out: one honest "safe to spend this month" number = income − bills due − goal contributions − spent. Manual entry, no bank linking (a privacy stance), INR and Indian instruments as first-class options.

## 3. Workspace (documents)

**What the market does**
- Notion: structured docs and databases; strong for meeting notes; weak on visual freedom.
- Milanote: visual boards for moodboards and storyboards; lacks version history and integrations.
- Craft: polished documents, deep links between documents, presentation mode.
- Microsoft Loop: portable live components, canvas pages that mix drawings, lists and paragraphs, a deliberately constrained format set.
- Users value visual freedom for early creative work, structure for notes, linking between documents, and easy export.

**Editor libraries**
- **Tiptap**: headless and very customisable; you build the UI. Paid tiers only for collaboration, comments and AI.
- **BlockNote**: Notion-style blocks out of the box, built on Tiptap, harder to customise deeply.
- **Lexical**: small core with plugins.
- Ink: the current Excalidraw ink layer adds roughly 3.5MB of extra code (mermaid, katex, cytoscape) and makes the main bundle 1.7MB. `perfect-freehand` (by the creator of tldraw) produces pressure-sensitive strokes in a few KB.

**What this means for TASKR**
- TASKR's paper-with-free-placed-objects model (like OneNote) is a real niche. Notion has no free placement, and Milanote has no paper or print fidelity. Keep it.
- Missing basics: more than one document, cloud saving, images that don't bloat localStorage, export to PDF, inline (per-word) text formatting, and adding or removing table rows and columns.

## 4. Flow (diagrams)

**What the market does**
- **draw.io**: deepest shape library, snap-to-grid and auto-layout engines; dated UI.
- **Excalidraw**: hand-drawn look, manual positioning, no auto-layout, Mermaid input.
- **Whimsical**: separate modes (flowchart, mind map, wireframe) with sensible defaults; fast; free tier capped at four boards.
- **tldraw**: predictable arrows on dense diagrams; an embeddable SDK.

**Libraries**
- **React Flow (`@xyflow/react`)**: custom nodes, multiple handles per node, built-in `smoothstep` and `step` (orthogonal) edges, edge labels, minimap, pan/zoom, snap grid.
- Auto-layout: **dagre** is simple (layered top-to-bottom or left-to-right). **elkjs** has advanced routing but a huge number of options. Use dagre first.

**What this means for TASKR**
- The current Flow is a custom 1440×900 fixed canvas with straight edges. Move it to React Flow on an infinite canvas with orthogonal edges, then add **one-click auto-layout (dagre)** and **Mermaid text import/export**. That combination gives draw.io-level tidiness with Whimsical-level speed.

## 5. Navigation and platform

- A **command palette (Ctrl/Cmd+K)** is now standard in power-user apps (Linear, Vercel, GitHub, Slack, Raycast). For an all-in-one app, a universal palette that mixes navigation, creation and settings, with recent items first, fits best. `cmdk` is the common headless building block.
- Accessibility pattern: a dialog with a focus trap, a combobox input and a listbox of results.

## 6. Supabase

- Enable RLS on every table. Write policies as `(select auth.uid()) = user_id`, because the subselect is evaluated once per query, not once per row. Index `user_id`. Never ship the service-role key.
- Storage: use private buckets with policies on `storage.objects`, a per-user folder `"{uid}/..."` checked with `storage.foldername(name)`, and signed URLs for sharing. Upsert needs SELECT and UPDATE grants as well.
- Google OAuth: Google redirects to `https://<project>.supabase.co/auth/v1/callback`. The app URL must be in Supabase's allowed redirect URLs, or the user silently lands on the Site URL.
- Free tier (third-party 2026 sources; check the official pricing page): about 500MB database, about 1GB storage, 50k monthly active users, and **the project pauses after 1 week of inactivity**. Pro costs $25/month.

---

## Sources
- Asana — Eisenhower matrix: https://asana.com/resources/eisenhower-matrix · https://asana.com/templates/eisenhower-matrix
- Vibe — Eisenhower overview: https://vibe.us/blog/eisenhower-matrix-overview/
- MakeUseOf — Eisenhower apps: https://www.makeuseof.com/apps-use-eisenhower-matrix-organizing-tasks/
- DEV — adjusted Eisenhower matrix: https://dev.to/thormeier/how-i-adjusted-the-eisenhower-matrix-to-boost-my-productivity-2d8c
- Miro vs FigJam: https://mockflow.com/blog/miro-vs-figjam · https://www.miquido.com/blog/figjam-vs-miro/ · https://clickup.com/blog/figmajam-vs-miro/
- NerdWallet budget apps: https://www.nerdwallet.com/finance/learn/best-budget-apps
- CNBC budget apps: https://www.cnbc.com/select/best-budgeting-apps/
- Forbes budget apps: https://www.forbes.com/financial-services/best-budgeting-apps-2/
- Quicken net worth: https://www.quicken.com/blog/best-budgeting-software-and-apps-for-net-worth-tracking-in-2026/
- Rob Berger personal finance software: https://robberger.com/personal-finance-software/
- India expense trackers: https://getfinny.app/blog/best-expense-tracker-apps-india-2026 · https://moneyview.in/loan-insights/best-money-management-apps-in-india · https://pocketclear.app/blog/best-expense-tracker-india.html
- Notion vs Milanote: https://www.nuclino.com/solutions/milanote-vs-notion
- Loop vs Notion: https://www.fastcompany.com/90871443/loop-vs-notion-microsofts-new-document-app-is-a-promising-mess
- Rich-text editors: https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025 · https://velt.dev/blog/best-rich-text-editors-react-2026 · https://tiptap.dev/alternatives/blocknote-vs-tiptap
- Diagram tools: https://dupple.com/learn/best-diagram-tools · https://instapods.com/apps/excalidraw/vs/drawio/ · https://flowova.ai/blog/draw-io-alternatives
- React Flow auto-layout: https://reactflow.dev/examples/layout/auto-layout · https://reactflow.dev/examples/layout/elkjs
- Command palettes: https://www.techinterview.org/post/3233475212/build-command-palette-cmd-k/ · https://helphub.commandbar.com/blog/command-palette-past-present-and-future
- Supabase RLS: https://makerkit.dev/blog/tutorials/supabase-rls-best-practices · https://bastion.tech/blog/supabase-security-best-practices
- Supabase storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase auth (OAuth, magic links): https://blog.elest.io/supabase-authentication-implement-oauth-magic-links-and-row-level-security/
- Supabase pricing: https://makerkit.dev/blog/saas/supabase-pricing · https://automationatlas.io/answers/supabase-free-tier-limits-2026/
