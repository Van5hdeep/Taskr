# 05 — Finance (redefined)

## Purpose
**Know where your money is, what's coming, and what's safe to spend.** Covers expenses, income, bills, budgets, savings goals and investments, all adding up to one net-worth number. Manual entry and CSV import; no bank linking (privacy-first).

## Current state → problems
| Today | Problem |
|---|---|
| `balance` is stored separately and adjusted by hand | Drifts from the transactions; manual edits break history |
| localStorage only | Not synced; lost when browser data is cleared |
| Single fixed category list; no edit transaction | Can't fix mistakes |
| One overall "period budget" | No per-category control |
| No savings, investments, bills, accounts | Gaps you listed as core |
| "Week" label shows today → +7 days, but the filter uses the *last* 7 days | Misleading |
| INR hard-coded | No preference |
| Two inline colour maps, one duplicated pie implementation | Maintenance |

## Structure (tabs under `/finance/...`)
1. **Overview**: the "Safe to spend" card, the month's income/expenses/net, budget bars for top categories, bills due in the next 14 days, goals progress, net-worth sparkline.
2. **Transactions**: fast entry row (amount → title → category → account → date; Enter saves; recent titles autocomplete with their last-used category). Table with search, filters (date range, account, category, type), inline edit, multi-select delete/recategorise, CSV import/export.
3. **Budgets**: monthly limit per category + optional overall limit; progress bars with a colour shift at 80% / 100%; optional rollover of unspent money. A "Copy last month" helper.
4. **Bills and subscriptions** (`fin_recurring`): name, amount, cadence, next due, account, category. Actions: **Mark paid** (creates the transaction and advances `next_due_on`) or **Skip**. A monthly-equivalent cost total for subscriptions ("you spend ₹X/month on subscriptions").
5. **Goals**: target, date, auto-computed **"save ₹X/month to hit it"**; contributions are transactions tagged with `goal_id` (usually a transfer to a savings account). Progress ring + projected completion date.
6. **Investments** (`fin_holdings`): mutual fund / stock / FD / RD / gold / EPF-PPF / NPS / crypto / real estate / other. Invested vs current value, absolute and % gain, SIP amount and day (feeds Bills as an outgoing recurring item), maturity date for FD/RD. A "Update value" action writes a snapshot. Allocation donut by kind.
7. **Accounts**: cash, bank, card, wallet (UPI), loan. Derived balance from the `fin_account_balances` view; transfers between accounts; loans and cards count as liabilities.

## Key calculations (pure functions in `features/finance/calc.js`)
- **Net worth** = Σ asset account balances + Σ holdings current value − Σ liability balances (loan, card).
- **Safe to spend (this month)** = income received this month − expenses so far − bills still due this month − planned goal contributions this month. If there's no income yet, it uses the monthly budget instead. Shown with its breakdown so it's never a black box.
- **Goal required monthly** = (target − saved) / months remaining (minimum 1).
- **Monthly-equivalent cost** for a recurring item: weekly × 52/12, quarterly / 3, yearly / 12.
- Period helpers respect `profiles.week_starts_on`.

## CSV import (stand-out for Indian users without bank linking)
- Upload a CSV → column-mapping step (date, description, debit, credit / amount, balance), with presets saved per user ("HDFC", "SBI", "ICICI" — derived from the user's first mapping, not hard-coded).
- Preview with auto-category suggestions from the user's own past titles (deterministic matching, no AI).
- Duplicate protection via `import_hash` = hash(date + amount + normalised description + account).
- Export: CSV of filtered transactions; the printable receipt/report stays (rebuilt from DB data).

## Stand-out
1. **Safe-to-spend with a visible breakdown**: one honest number, not five charts.
2. **Bills + SIPs + goals on one timeline**, so "what's coming" is always visible.
3. **India-first defaults**: INR, UPI wallets, SIP/EPF/PPF/NPS/FD types, `en-IN` number grouping (₹1,00,000), Monday weeks. All are preferences, not hard-coded.
4. **Privacy stance**: no bank linking or SMS reading; CSV and manual entry, with your data under your account only.

## Data
`fin_accounts`, `fin_categories`, `fin_transactions`, `fin_budgets`, `fin_recurring`, `fin_goals`, `fin_holdings`, `fin_holding_snapshots`, view `fin_account_balances`. The first visit seeds a "Cash" account plus default categories (the current 8 expense + 5 income types).

## Implementation notes
- `features/finance/api.js` + hooks per entity; the Overview queries in parallel.
- Money is stored as `numeric(14,2)`. In JS, amounts are kept as integers in paise for maths (`toPaise`/`fromPaise`) to avoid float errors.
- Charts: reuse the existing SVG approach (no heavy chart library); restyle in the redesign.
- Remove the manual "Edit balance" control. Set the account's **opening balance** instead (with a "reconcile" helper that creates an adjustment transaction).

## Acceptance checks
- Add expense → the account balance, budget bar, overview and safe-to-spend all update without a reload.
- Mark a bill paid → a transaction is created, the next due date advances, the balance updates.
- Import the same CSV twice → no duplicates.
- Net worth = accounts + holdings − liabilities, matching a manual calculation.
- Signing in on another browser shows identical numbers.
