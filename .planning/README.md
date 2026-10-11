# TASKR — Planning

Status: **PLANNING COMPLETE — decisions resolved — waiting for "execute"**
Environment: localhost only; deploy happens after the UI redesign.
Date: 2026-10-10 · Branch: `tables`

TASKR is one place for four kinds of personal work:

| Tool | One-line purpose (redefined) |
|---|---|
| **Sticker** | Capture what you must remember and decide what matters *now*: a prioritisation board with a 2×2 matrix, a free board and list views. |
| **Finance** | See where your money is: accounts, spending, budgets, bills, savings goals and investments, ending in one net-worth number. |
| **Workspace** | Paper-like documents where text, tables, shapes, images and ink can sit anywhere on the page. |
| **Flow** | Diagrams that stay tidy: connected blocks with auto-layout, templates, and text import/export. |

## Files in this folder

| File | What it covers |
|---|---|
| [00-research.md](00-research.md) | What the market does for each tool, what users value, and the sources |
| [01-ai-removal.md](01-ai-removal.md) | What was removed and why (done) |
| [02-supabase-auth-and-data.md](02-supabase-auth-and-data.md) | Authentication, database schema, row-level security, storage, migrating localStorage data, **what I need from you** |
| [03-platform-and-navigation.md](03-platform-and-navigation.md) | App shell, routing, command palette, home dashboard, code structure, performance |
| [04-sticker.md](04-sticker.md) | Sticker redefinition |
| [05-finance.md](05-finance.md) | Finance redefinition |
| [06-workspace.md](06-workspace.md) | Workspace redefinition |
| [07-flow.md](07-flow.md) | Flow redefinition |
| [08-execution-roadmap.md](08-execution-roadmap.md) | Ordered phases, tasks, acceptance checks, risks |
| [sql/0001_init.sql](sql/0001_init.sql) | Draft migration (not applied yet) |

## Principles for the "function redefine"

1. **Cloud first, browser second.** Everything a user creates lives in Supabase under row-level security. localStorage holds only UI preferences.
2. **Function before looks.** This phase changes behaviour, data and navigation. The visual redesign comes after the GitHub push, as you asked. New UI follows the current styling and stays simple, so the redesign can restyle it without rewriting logic.
3. **Logic lives outside components.** Each tool gets its own `api.js` (Supabase calls), hooks (state) and plain helper functions, so the later redesign only touches JSX and CSS.
4. **No AI.** Anything "smart" (date parsing, auto-layout, text-to-diagram) is deterministic code that runs locally.
5. **Each tool must answer one question better than a generic app does.** That answer is listed as the "stand-out" section in each tool's plan.

## Order of work (summary)

0. Foundation: cleanup, routing, app shell, data-layer pattern, code splitting
1. Supabase: schema, auth flows, profiles, import of existing localStorage data
2. Sticker → 3. Finance → 4. Workspace → 5. Flow
6. Cross-tool: home dashboard, command palette, quick capture, links between items
7. QA, README rewrite, push to GitHub
8. *(next stage)* complete UI redesign
9. Deploy (prod Supabase project, Google sign-in, Firebase)

Full detail is in [08-execution-roadmap.md](08-execution-roadmap.md).
