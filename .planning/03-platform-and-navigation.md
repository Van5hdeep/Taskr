# 03 — Platform, navigation and code structure

## Problems today
| Problem | Where |
|---|---|
| No URLs: the back button, refresh and shared links all drop you on Home | `activeScreen` state in [App.jsx](../src/App.jsx) |
| Navigation hides in a hamburger drawer; switching tools takes 2 clicks | `SidebarMenu` in App.jsx |
| `App.jsx` is a 1,460-line monolith (auth screen, sidebar, sticker UI, alert engine, CRUD) | [App.jsx](../src/App.jsx) |
| Home shows only "saved workspace" names, not real data | [DashboardHome.jsx](../src/components/dashboard/DashboardHome.jsx) |
| "Save" on each tool only registers a name; Flow can't be saved to Home at all | `handleSaveWorkspace` |
| Dark theme exists but can never be switched on (`dark` never changes) | App.jsx |
| Sticker filters are coded but never rendered | `TaskFilterBar` |
| Workspace (with Excalidraw) loads eagerly → 1.7MB main bundle + about 3.5MB of extra chunks | build output |
| Unused files: `dashboard/DashboardSection`, `DotGrid`, `ProjectCard`, `ProjectGrid`, `WorkspaceHero`, `y/`, `public/TASKR - Copy.png`, `tsconfig.tsbuildinfo` | — |
| README is stale (hackathon, React 18, judge login) | README.md |

## Target structure
```
src/
  main.jsx                     router + providers
  app/
    AppShell.jsx               persistent sidebar + top bar + <Outlet/>
    routes.jsx                 route table (lazy per tool)
    CommandPalette.jsx         Ctrl/Cmd+K
    QuickCapture.jsx           global "+" / Ctrl+Shift+N → new task, expense, doc or flow
    SettingsPage.jsx
  lib/
    supabase.js · auth/AuthProvider.jsx · auth/RequireAuth.jsx
    useAutosave.js · useHotkeys.js · format.js (currency, dates) · dates.js (natural-date parsing)
  features/
    auth/      LandingPage, SignIn, SignUp, ForgotPassword, ResetPassword, AuthCallback
    home/      HomePage + widgets
    sticker/   api.js, hooks, BoardPage, MatrixView, FreeBoardView, ListView, StickerCard, CaptureBar
    finance/   api.js, hooks, FinanceLayout + tabs (Overview, Transactions, Budgets, Bills, Goals, Investments, Accounts)
    workspace/ api.js, hooks, DocumentsList, DocumentEditor (+ blocks/, ink/)
    flow/      api.js, hooks, FlowsList, FlowEditor (+ nodes/, edges/, layout.js, mermaid.js)
  components/ui/   shared primitives (Button, Dialog, Dropdown, Toast wrapper, EmptyState, ConfirmDialog)
```
Everything is `.jsx`/`.js`, matching the current code. TypeScript stays limited to config. (Converting to TS is optional later.)

## Routing
`react-router` with these routes:

| Path | Screen |
|---|---|
| `/` | Landing (signed-out) → redirects to `/home` when signed in |
| `/auth/sign-in`, `/auth/sign-up`, `/auth/forgot`, `/auth/reset`, `/auth/callback` | Auth |
| `/home` | Today dashboard |
| `/sticker`, `/sticker/:boardId?view=matrix\|free\|list` | Boards |
| `/finance/(overview\|transactions\|budgets\|bills\|goals\|investments\|accounts)` | Finance tabs |
| `/workspace`, `/workspace/:docId` | Documents list / editor |
| `/flow`, `/flow/:flowId` | Diagrams list / editor |
| `/settings` | Profile, theme, currency, week start, data export, delete account |

Firebase already rewrites `**` to `index.html`, so deep links work.

## Navigation model
- **Persistent left sidebar** (collapsible to icons; becomes a bottom tab bar on mobile): Home · Sticker · Finance · Workspace · Flow · Settings. Under each tool: **pinned and recent items** (boards, documents, flows).
- **Command palette (Ctrl/Cmd+K)** using `cmdk`, recent items first:
  - Go to: any tool, board, document, flow, finance tab
  - Create: task, expense, income, document, flow, board
  - Search: task titles, transaction titles, document and flow titles (server `ilike` queries, debounced)
  - Actions: toggle theme, sign out, open settings
- **Quick capture** (Ctrl+Shift+N or the "+" button): one input. A prefix picks the type (`t ` task, `e ` expense, `i ` income), and deterministic parsing reads dates ("tomorrow 5pm", "fri") and amounts ("₹450 lunch"). No AI. Uses `chrono-node` for dates.
- **Keyboard map**: `G H/S/F/W/L` go-to shortcuts, `?` opens the shortcut sheet. Each tool documents its own shortcuts in that sheet.
- **Breadcrumb / title area** in the top bar: Tool › Item title (renameable inline) + save status.

## Home ("Today")
Built from real data, not a "saved workspaces" list:
1. Greeting + date.
2. **Focus**: Do-first quadrant tasks + tasks due today/overdue (check off inline).
3. **Money**: safe-to-spend this month, bills due in the next 7 days, budget usage bar.
4. **Continue**: the 4 most recently edited documents/flows/boards (by `updated_at`).
5. **Upcoming**: 7-day agenda (task deadlines + bill due dates).

Each widget links to its tool. Empty states teach the tool in one line.

## Cross-cutting behaviour
- **Autosave everywhere** with one status pill (Saving… / Saved / Offline). The "Save" modal is removed; "Save" becomes rename + "Export".
- **Confirmations** use the shared `ConfirmDialog` (no `window.confirm`). Destructive actions offer **Undo** in the toast (5 s) where possible, plus archive instead of delete for top-level items.
- **Reminders**: browser Notification API (permission asked from Settings, never on load) + in-app toasts. Only for tasks with `remind_at` and bills due. Runs while the app is open (push notifications are out of scope for v1).
- **Theme**: system / light / dark from `profiles.theme`, applied with a `data-theme` attribute. The redesign will restyle it; this phase only wires the toggle.
- **Error boundaries** per route so one tool crashing doesn't blank the app.
- **Performance**: each tool is a lazy route chunk. Excalidraw is removed (see Workspace). Target: main chunk < 300KB gzip.

## Libraries to add (verify the latest stable version at install)
| Library | Why |
|---|---|
| `react-router` | URLs, nested layouts, lazy routes |
| `cmdk` | Command palette primitive |
| `chrono-node` | Natural-language date parsing (quick capture, task deadlines) |
| `@xyflow/react` + `@dagrejs/dagre` | Flow editor + auto-layout |
| `perfect-freehand` | Workspace ink (replaces Excalidraw) |
| `@tiptap/react` + starter-kit (+ underline, highlight, text-style, color, link) | Rich text inside Workspace text boxes |
| `papaparse` | CSV import/export (finance) |
| `jspdf` *(or the existing hand-written PDF writer in Flow)* | Workspace PDF export |
| `date-fns` | Date maths (recurrence, periods) |

To remove: `@excalidraw/excalidraw`, `gsap` and `animejs` (the last two are already imported nowhere in `src/`).
