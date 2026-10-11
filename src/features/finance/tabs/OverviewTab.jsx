import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowDownRight, ArrowUpRight, CalendarClock, ChevronRight, Info, Plus, Scale, Sparkles } from "../../../lib/icons";
import { getDaysInMonth } from "date-fns";
import { useMoneyFormat } from "../../../lib/profile";
import { useFinance } from "../FinanceStore";
import { budgetUsage, goalSaved, monthRange, netWorth, parseDay, safeToSpend, spentByCategory, sumAmounts, toDay } from "../calc";
import TransactionForm from "../components/TransactionForm";
import { buttonPrimary, buttonSecondary, Card, Donut, ProgressBar } from "../components/ui";

function SpendPace({ transactions, budget }) {
  const money = useMoneyFormat();
  const today = new Date();
  const days = getDaysInMonth(today);
  const range = monthRange(today);
  const daily = Array(days).fill(0);
  for (const tx of transactions) {
    if (tx.kind === "expense" && tx.occurred_on >= range.start && tx.occurred_on <= range.end) daily[parseDay(tx.occurred_on).getDate() - 1] += Number(tx.amount);
  }
  const cumulative = [];
  daily.reduce((total, value, index) => { cumulative[index] = total + value; return cumulative[index]; }, 0);
  const shown = cumulative.slice(0, today.getDate());
  const max = Math.max(budget || 0, ...shown, 1) * 1.1;
  const w = 600; const h = 180; const pad = 8;
  const x = (i) => pad + (i / Math.max(1, days - 1)) * (w - pad * 2);
  const y = (v) => h - pad - (v / max) * (h - pad * 2);
  const path = shown.map((value, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  const over = budget > 0 && shown.at(-1) > (budget * today.getDate()) / days;

  return (
    <Card title="Spending this month" action={budget > 0 ? <span className={`text-xs font-semibold ${over ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>{over ? "Ahead of budget pace" : "On pace"}</span> : null}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full" role="img" aria-label={`Spent ${money(shown.at(-1) ?? 0)} so far this month`}>
        {budget > 0 && <line x1={x(0)} y1={y(0)} x2={x(days - 1)} y2={y(budget)} stroke="currentColor" strokeDasharray="5 5" className="text-stone-300 dark:text-stone-600" strokeWidth="1.5" />}
        {budget > 0 && <line x1={pad} x2={w - pad} y1={y(budget)} y2={y(budget)} stroke="currentColor" className="text-stone-200 dark:text-white/10" />}
        <path d={`${path} L${x(shown.length - 1)},${h - pad} L${x(0)},${h - pad} Z`} className="fill-amber-500/10" />
        <path d={path} fill="none" strokeWidth="2.5" className={over ? "stroke-amber-500" : "stroke-amber-600"} strokeLinejoin="round" strokeLinecap="round" />
        {shown.length > 0 && <circle cx={x(shown.length - 1)} cy={y(shown.at(-1))} r="4" className={over ? "fill-amber-500" : "fill-amber-600"} />}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-stone-500 dark:text-stone-400">
        <span>1st</span>
        <span>{money(shown.at(-1) ?? 0)} spent{budget > 0 ? ` · budget ${money(budget)} (dashed = even pace)` : ""}</span>
        <span>{days}th</span>
      </div>
    </Card>
  );
}

export default function OverviewTab() {
  const finance = useFinance();
  const { accounts, balances, holdings, transactions, recurring, goals, budgets, categories } = finance;
  const money = useMoneyFormat();
  const [adding, setAdding] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const overall = budgets.find((budget) => budget.category_id == null);
  const overallUsage = overall ? budgetUsage(overall, transactions) : null;
  const safe = useMemo(() => safeToSpend({ transactions, recurring, goals, overallBudget: overallUsage?.limit ?? 0 }), [transactions, recurring, goals, overallUsage?.limit]);
  const worth = netWorth(accounts, balances, holdings);
  const range = monthRange(new Date());
  const monthTx = transactions.filter((tx) => tx.occurred_on >= range.start && tx.occurred_on <= range.end);
  const income = sumAmounts(monthTx.filter((tx) => tx.kind === "income"));
  const expenses = sumAmounts(monthTx.filter((tx) => tx.kind === "expense"));

  const today = toDay(new Date());
  const in14 = toDay(new Date(Date.now() + 14 * 86400000));
  // Overdue items stay at the top until they're marked paid or skipped.
  const upcoming = recurring
    .filter((item) => item.is_active && item.next_due_on <= in14)
    .map((item) => ({ item, due: item.next_due_on }))
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 6);

  const spent = spentByCategory(transactions, range);
  const slices = Object.entries(spent).map(([id, value]) => {
    const category = categories.find((item) => item.id === id);
    return { id, value, label: category?.name ?? "Uncategorised", color: category?.color ?? "#94a3b8" };
  }).sort((a, b) => b.value - a.value);

  const categoryBudgets = budgets.filter((budget) => budget.category_id != null)
    .map((budget) => ({ budget, usage: budgetUsage(budget, transactions), category: categories.find((item) => item.id === budget.category_id) }))
    .sort((a, b) => b.usage.ratio - a.usage.ratio).slice(0, 4);
  const activeGoals = goals.filter((goal) => !goal.archived_at && !goal.achieved_at).slice(0, 3);
  const isEmpty = !transactions.length && !recurring.length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-950 via-amber-950 to-indigo-950 p-6 text-white shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-amber-300"><Sparkles className="h-3.5 w-3.5" /> Safe to spend this month</p>
              <p className={`mt-2 text-4xl font-black tabular-nums ${safe.amount < 0 ? "text-rose-300" : ""}`}>{safe.amount < 0 ? "−" : ""}{money(Math.abs(safe.amount))}</p>
              <p className="mt-1 text-sm text-stone-300">{safe.amount < 0 ? "Planned costs are ahead of what's coming in." : "After bills still due and goal savings."}</p>
            </div>
            <button type="button" onClick={() => setShowBreakdown((value) => !value)} className="rounded-full bg-white/10 p-2 text-amber-200 hover:bg-white/20" aria-expanded={showBreakdown} aria-label="How is this calculated?"><Info className="h-4 w-4" /></button>
          </div>
          {showBreakdown && (
            <dl className="mt-5 space-y-1.5 rounded-xl bg-white/10 p-4 text-sm">
              {[
                [safe.basis === "income" ? "Income received this month" : "Overall monthly budget (no income recorded yet)", safe.base, "+"],
                ["Spent so far", safe.spent, "−"],
                ["Bills still due this month", safe.billsDue, "−"],
                ["Goal savings planned this month", safe.goalsPlanned, "−"],
              ].map(([label, value, sign]) => (
                <div key={label} className="flex justify-between gap-4"><dt className="text-stone-300">{label}</dt><dd className="font-semibold tabular-nums">{sign} {money(value)}</dd></div>
              ))}
            </dl>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => setAdding("expense")} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-stone-900 hover:bg-amber-50"><Plus className="h-3.5 w-3.5" /> Expense</button>
            <button type="button" onClick={() => setAdding("income")} className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20"><Plus className="h-3.5 w-3.5" /> Income</button>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Card><p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-stone-500"><ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" /> Income</p><p className="mt-1 text-xl font-extrabold tabular-nums text-stone-900 dark:text-white">{money(income)}</p></Card>
          <Card><p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-stone-500"><ArrowDownRight className="h-3.5 w-3.5 text-rose-500" /> Spent</p><p className="mt-1 text-xl font-extrabold tabular-nums text-stone-900 dark:text-white">{money(expenses)}</p></Card>
          <Card className="col-span-2">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-stone-500"><Scale className="h-3.5 w-3.5 text-amber-500" /> Net worth</p>
              <Link to="/finance/accounts" className="text-xs font-semibold text-amber-700 hover:underline">Accounts</Link>
            </div>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-stone-900 dark:text-white">{worth.total < 0 ? "−" : ""}{money(Math.abs(worth.total))}</p>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{money(worth.assets)} in accounts · {money(worth.investments)} invested · {money(worth.liabilities)} owed</p>
          </Card>
        </div>
      </div>

      {isEmpty && (
        <Card>
          <p className="text-sm font-bold text-stone-900 dark:text-white">Get set up in three steps</p>
          <ol className="mt-3 grid gap-2 text-sm text-stone-600 dark:text-stone-300 sm:grid-cols-3">
            <li><Link to="/finance/accounts" className="font-semibold text-amber-700 hover:underline">1. Add your accounts</Link> with today's balances.</li>
            <li><Link to="/finance/bills" className="font-semibold text-amber-700 hover:underline">2. Add rent, EMIs, subscriptions</Link> and salary.</li>
            <li><Link to="/finance/transactions" className="font-semibold text-amber-700 hover:underline">3. Record spending</Link> or import a statement.</li>
          </ol>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><SpendPace transactions={transactions} budget={overallUsage?.limit ?? 0} /></div>
        <Card title="Coming up" action={<Link to="/finance/bills" className="inline-flex items-center text-xs font-semibold text-amber-700 hover:underline">All <ChevronRight className="h-3.5 w-3.5" /></Link>}>
          {upcoming.length ? (
            <ul className="space-y-2.5">
              {upcoming.map(({ item, due }) => {
                const overdue = due < today;
                return (
                  <li key={item.id} className="flex items-center gap-3 text-sm">
                    <CalendarClock className={`h-4 w-4 shrink-0 ${overdue ? "text-red-500" : "text-stone-400"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-stone-800 dark:text-stone-200">{item.title}</span>
                      <span className={`text-xs ${overdue ? "font-bold text-red-600 dark:text-red-400" : "text-stone-500"}`}>{overdue ? "Overdue · " : ""}{parseDay(due).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</span>
                    </span>
                    <span className={`font-bold tabular-nums ${item.kind === "income" ? "text-emerald-600" : "text-stone-900 dark:text-white"}`}>{money(item.amount)}</span>
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-sm text-stone-500">Nothing due in the next two weeks.</p>}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Where it went">
          {slices.length ? (
            <div className="flex flex-col items-center gap-4">
              <Donut slices={slices} centerLabel="Spent" centerValue={money(expenses)} size={150} />
              <ul className="w-full space-y-1.5 text-xs">
                {slices.slice(0, 6).map((slice) => (
                  <li key={slice.id} className="flex justify-between gap-2"><span className="flex min-w-0 items-center gap-2 text-stone-600 dark:text-stone-300"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} /><span className="truncate">{slice.label}</span></span><span className="font-semibold tabular-nums text-stone-900 dark:text-white">{money(slice.value)}</span></li>
                ))}
              </ul>
            </div>
          ) : <p className="text-sm text-stone-500">No spending recorded this month.</p>}
        </Card>
        <Card title="Budgets" action={<Link to="/finance/budgets" className="inline-flex items-center text-xs font-semibold text-amber-700 hover:underline">All <ChevronRight className="h-3.5 w-3.5" /></Link>}>
          {overallUsage || categoryBudgets.length ? (
            <ul className="space-y-4">
              {overallUsage && (
                <li><div className="mb-1 flex justify-between text-xs"><span className="font-bold text-stone-800 dark:text-stone-200">Overall</span><span className="text-stone-500">{money(overallUsage.spent)} / {money(overallUsage.limit)}</span></div><ProgressBar ratio={overallUsage.ratio} /></li>
              )}
              {categoryBudgets.map(({ budget, usage, category }) => (
                <li key={budget.id}><div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-stone-700 dark:text-stone-300">{category?.name}</span><span className="text-stone-500">{money(usage.spent)} / {money(usage.limit)}</span></div><ProgressBar ratio={usage.ratio} /></li>
              ))}
            </ul>
          ) : <div className="text-sm text-stone-500"><p>No budgets yet.</p><Link to="/finance/budgets" className={`${buttonSecondary} mt-3`}>Set a budget</Link></div>}
        </Card>
        <Card title="Goals" action={<Link to="/finance/goals" className="inline-flex items-center text-xs font-semibold text-amber-700 hover:underline">All <ChevronRight className="h-3.5 w-3.5" /></Link>}>
          {activeGoals.length ? (
            <ul className="space-y-4">
              {activeGoals.map((goal) => {
                const saved = goalSaved(goal, transactions);
                return <li key={goal.id}><div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-stone-700 dark:text-stone-300">{goal.name}</span><span className="text-stone-500">{money(saved)} / {money(goal.target_amount)}</span></div><ProgressBar ratio={saved / goal.target_amount} tone="bg-stone-900 dark:bg-amber-400 dark:text-stone-900" /></li>;
              })}
            </ul>
          ) : <div className="text-sm text-stone-500"><p>No goals yet.</p><Link to="/finance/goals" className={`${buttonPrimary} mt-3`}>Create a goal</Link></div>}
        </Card>
      </div>

      {adding && <TransactionForm initial={{ kind: adding }} onClose={() => setAdding(null)} />}
    </div>
  );
}
