import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { addDays } from "date-fns";
import { ArrowUpRight, CalendarClock, Check, FileText, GitBranch, Loader2, Plus, StickyNote, Wallet } from "../../lib/icons";
import { toast } from "sonner";
import { useAuth } from "../../lib/auth/AuthProvider";
import { useMoneyFormat } from "../../lib/profile";
import { formatSupabaseError } from "../../lib/supabase";
import * as stickerApi from "../sticker/api";
import { compareTasks } from "../sticker/logic";
import { urgencyMeta, urgencyOf } from "../sticker/constants";
import { formatDue } from "../sticker/format";
import { budgetUsage, monthRange, parseDay, safeToSpend, sumAmounts, toDay } from "../finance/calc";
import { openQuickCapture } from "../../app/globalEvents";
import { loadHome } from "./api";

const DAY = 24 * 60 * 60 * 1000;

function Card({ title, action, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-stone-200/80 bg-white p-5 dark:border-white/[0.07] dark:bg-ink-900 ${className}`}>
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-stone-900 dark:text-white">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

const Open = ({ to, label }) => (
  <Link to={to} aria-label={label} title={label} className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-600 transition-colors hover:bg-stone-900 hover:text-white dark:border-white/10 dark:text-stone-300 dark:hover:bg-amber-400 dark:hover:text-stone-900">
    <ArrowUpRight className="h-4 w-4" />
  </Link>
);

function greeting(date) {
  const hour = date.getHours();
  return hour < 5 ? "Working late" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/** Half-ring gauge of how much of today's must-dos are done. */
function DayGauge({ done, total }) {
  const ratio = total ? done / total : 0;
  const radius = 70;
  const length = Math.PI * radius;
  return (
    <div className="relative w-[200px] shrink-0" role="img" aria-label={`${done} of ${total} done today`}>
      <svg viewBox="0 0 180 104" className="w-full">
        <path d="M20 94 A70 70 0 0 1 160 94" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" className="text-white/80 dark:text-white/10" />
        <path d="M20 94 A70 70 0 0 1 160 94" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" className="text-amber-400 transition-[stroke-dashoffset] duration-700" strokeDasharray={length} strokeDashoffset={length * (1 - ratio)} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="font-brand text-3xl font-semibold tracking-tight text-stone-900 dark:text-white">{total ? `${Math.round(ratio * 100)}%` : "—"}</p>
        <p className="text-xs text-stone-500 dark:text-stone-400">{total ? `${done} of ${total} done today` : "Nothing due today"}</p>
      </div>
    </div>
  );
}

/** Spending per day for the last 7 days. */
function SpendBars({ days, money }) {
  const max = Math.max(1, ...days.map((day) => day.amount));
  return (
    <div className="flex h-28 items-end gap-2">
      {days.map((day) => (
        <div key={day.key} className="flex flex-1 flex-col items-center gap-1.5" title={`${day.label}: ${money(day.amount)}`}>
          <div className="flex w-full flex-1 items-end">
            <div className={`w-full rounded-md ${day.today ? "bg-amber-400" : "bg-stone-200 dark:bg-white/10"}`} style={{ height: `${Math.max(4, (day.amount / max) * 100)}%` }} />
          </div>
          <span className={`text-[10px] font-medium ${day.today ? "text-stone-900 dark:text-white" : "text-stone-400"}`}>{day.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const { displayName } = useAuth();
  const money = useMoneyFormat();
  const [data, setData] = useState(null);
  const [completing, setCompleting] = useState(null);
  const now = useMemo(() => new Date(), [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(() => {
    loadHome().then(setData).catch((err) => setData({ errors: [err], tasks: [], boards: [], finance: null, documents: [], flows: [], doneToday: 0 }));
  }, []);
  useEffect(() => { load(); }, [load]);

  const todayEnd = useMemo(() => { const end = new Date(now); end.setHours(23, 59, 59, 999); return end; }, [now]);

  const focus = useMemo(() => {
    if (!data?.tasks) return [];
    return data.tasks
      .filter((task) => (task.deadline && task.deadline <= todayEnd) || urgencyOf(task) === "red")
      .sort((a, b) => compareTasks(a, b, now.getTime()));
  }, [data, now, todayEnd]);

  const finance = useMemo(() => {
    if (!data?.finance) return null;
    const { transactions, recurring, goals, budgets } = data.finance;
    const overall = budgets.find((budget) => budget.category_id == null);
    const usage = overall ? budgetUsage(overall, transactions, now) : null;
    const safe = safeToSpend({ transactions, recurring, goals, overallBudget: usage?.limit ?? 0, today: now });
    const range = monthRange(now);
    const spent = sumAmounts(transactions.filter((tx) => tx.kind === "expense" && tx.occurred_on >= range.start && tx.occurred_on <= range.end));
    const weekEnd = toDay(addDays(now, 7));
    const bills = recurring.filter((item) => item.kind === "expense" && item.next_due_on <= weekEnd);
    const week = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(now, i - 6);
      const key = toDay(day);
      return { key, today: i === 6, label: day.toLocaleDateString(undefined, { weekday: "narrow" }), amount: sumAmounts(transactions.filter((tx) => tx.kind === "expense" && tx.occurred_on === key)) };
    });
    const isEmpty = !transactions.length && !recurring.length;
    return { safe, usage, spent, bills, week, isEmpty };
  }, [data, now]);

  const recent = useMemo(() => {
    if (!data) return [];
    return [
      ...data.documents.map((doc) => ({ kind: "document", id: doc.id, title: doc.title, updated: doc.updated_at, to: `/workspace/${doc.id}` })),
      ...data.flows.map((flow) => ({ kind: "flow", id: flow.id, title: flow.title, updated: flow.updated_at, to: `/flow/${flow.id}` })),
    ].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 6);
  }, [data]);

  const agenda = useMemo(() => {
    if (!data) return [];
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * DAY)).map((day) => {
      const key = toDay(day);
      const tasks = (data.tasks ?? []).filter((task) => task.deadline && toDay(task.deadline) === key);
      const bills = (data.finance?.recurring ?? []).filter((item) => item.next_due_on === key);
      return { day, key, tasks, bills };
    }).filter((entry) => entry.tasks.length || entry.bills.length);
  }, [data, now]);

  const complete = async (task) => {
    setCompleting(task.id);
    try {
      const spawned = await stickerApi.completeTask(task);
      setData((current) => ({ ...current, doneToday: current.doneToday + 1, tasks: [...current.tasks.filter((item) => item.id !== task.id), ...(spawned ? [spawned] : [])] }));
      toast.success(`Done: "${task.title}"`, {
        action: {
          label: "Undo",
          onClick: async () => {
            await stickerApi.updateTask(task.id, { completedAt: null });
            if (spawned) await stickerApi.deleteTask(spawned.id);
            load();
          },
        },
      });
    } catch (err) {
      toast.error(formatSupabaseError(err));
    } finally {
      setCompleting(null);
    }
  };

  if (!data) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;

  const openCount = data.tasks?.length ?? 0;
  const urgentCount = (data.tasks ?? []).filter((task) => urgencyOf(task) === "red").length;
  const stats = [
    { label: "Open stickers", value: openCount, to: "/sticker" },
    { label: "Urgent", value: urgentCount, to: "/sticker" },
    { label: "Spent this month", value: finance && !finance.isEmpty ? money(finance.spent) : "—", to: "/finance/transactions" },
    { label: "Documents & flows", value: data.documents.length + data.flows.length, to: "/workspace" },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 sm:px-6 lg:py-8">
      <section className="relative mb-5 overflow-hidden rounded-3xl border border-amber-200/60 bg-gradient-to-br from-white via-cream-50 to-amber-100/70 p-6 sm:p-8 dark:border-white/[0.07] dark:from-ink-900 dark:via-ink-900 dark:to-amber-400/10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-stone-500 dark:text-stone-400">{now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            <h1 className="mt-1 font-brand text-3xl font-semibold tracking-[-0.03em] text-stone-900 sm:text-4xl dark:text-white">{greeting(now)}, {displayName}</h1>
            <div className="mt-7 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
              {stats.map((stat) => (
                <Link key={stat.label} to={stat.to} className="group">
                  <p className="font-brand text-2xl font-semibold tabular-nums tracking-tight text-stone-900 sm:text-3xl dark:text-white">{stat.value}</p>
                  <p className="mt-0.5 text-xs text-stone-500 group-hover:text-stone-800 dark:text-stone-400 dark:group-hover:text-stone-200">{stat.label}</p>
                </Link>
              ))}
            </div>
          </div>
          <DayGauge done={data.doneToday} total={data.doneToday + focus.length} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Focus today" action={<Open to="/sticker" label="Open Sticker" />} className="lg:col-span-2">
          {data.tasks == null ? <p className="text-sm text-stone-500">Couldn't load stickers.</p> : focus.length ? (
            <ul className="space-y-2">
              {focus.slice(0, 7).map((task) => {
                const overdue = task.deadline && task.deadline.getTime() < now.getTime();
                const urgency = urgencyMeta(urgencyOf(task));
                return (
                  <li key={task.id} className="flex items-center gap-3 rounded-xl border border-stone-100 bg-cream-50/70 px-3 py-2.5 dark:border-white/[0.05] dark:bg-white/[0.02]">
                    <button type="button" onClick={() => complete(task)} disabled={completing === task.id} aria-label={`Complete ${task.title}`} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-stone-300 text-transparent transition-colors hover:border-emerald-500 hover:bg-emerald-500 hover:text-white dark:border-stone-600">
                      {completing === task.id ? <Loader2 className="h-3 w-3 animate-spin text-stone-400" /> : <Check className="h-3 w-3" strokeWidth={3} />}
                    </button>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${urgency.dot}`} title={urgency.label} />
                    <Link to={`/sticker?task=${task.id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-stone-900 hover:underline dark:text-stone-100">{task.title}</Link>
                    {task.deadline && <span className={`shrink-0 text-xs ${overdue ? "font-semibold text-red-600 dark:text-red-400" : "text-stone-500 dark:text-stone-400"}`}>{overdue ? "Overdue" : formatDue(task.deadline, now.getTime())}</span>}
                  </li>
                );
              })}
              {focus.length > 7 && <li className="pt-1 text-xs text-stone-500"><Link to="/sticker" className="hover:underline">+{focus.length - 7} more on the board</Link></li>}
            </ul>
          ) : (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-stone-300 px-6 py-8 text-center dark:border-white/10">
              <StickyNote className="h-7 w-7 text-stone-300 dark:text-stone-600" />
              <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Nothing urgent or due today.</p>
              <button type="button" onClick={() => openQuickCapture("task")} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-800 dark:bg-amber-400 dark:text-stone-900"><Plus className="h-3.5 w-3.5" /> Add a sticker</button>
            </div>
          )}
        </Card>

        <Card title="Money" action={<Open to="/finance" label="Open Finance" />}>
          {!finance ? <p className="text-sm text-stone-500">Couldn't load finance.</p> : finance.isEmpty ? (
            <div className="text-sm text-stone-500 dark:text-stone-400">
              <Wallet className="h-7 w-7 text-stone-300 dark:text-stone-600" />
              <p className="mt-2">Add your accounts and spending to see what's safe to spend.</p>
              <Link to="/finance/accounts" className="mt-3 inline-flex rounded-xl bg-stone-900 px-3 py-2 text-xs font-semibold text-white dark:bg-amber-400 dark:text-stone-900">Set up Finance</Link>
            </div>
          ) : (
            <>
              <p className="text-xs text-stone-500 dark:text-stone-400">Safe to spend this month</p>
              <p className={`font-brand text-3xl font-semibold tabular-nums tracking-tight ${finance.safe.amount < 0 ? "text-red-600" : "text-stone-900 dark:text-white"}`}>{finance.safe.amount < 0 ? "−" : ""}{money(Math.abs(finance.safe.amount))}</p>
              <p className="mb-2 mt-5 text-xs text-stone-500 dark:text-stone-400">Spending, last 7 days</p>
              <SpendBars days={finance.week} money={money} />
              {finance.bills.length > 0 && (
                <div className="mt-4 border-t border-stone-100 pt-3 dark:border-white/[0.06]">
                  <p className="mb-2 text-xs text-stone-500 dark:text-stone-400">Bills this week</p>
                  <ul className="space-y-1.5">
                    {finance.bills.slice(0, 3).map((bill) => (
                      <li key={bill.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate text-stone-700 dark:text-stone-300">{bill.title} <span className={`text-xs ${bill.next_due_on < toDay(now) ? "font-semibold text-red-600" : "text-stone-400"}`}>· {bill.next_due_on < toDay(now) ? "overdue" : parseDay(bill.next_due_on).toLocaleDateString(undefined, { weekday: "short" })}</span></span>
                        <span className="font-semibold tabular-nums text-stone-900 dark:text-white">{money(bill.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </Card>

        <Card title="Pick up where you left off" action={<Open to="/workspace" label="Open Workspace" />} className="lg:col-span-2">
          {recent.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {recent.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Link to={item.to} className="flex items-center gap-3 rounded-xl border border-stone-100 p-3 transition-colors hover:border-stone-300 hover:bg-cream-50 dark:border-white/[0.06] dark:hover:bg-white/[0.03]">
                    {item.kind === "flow" ? <GitBranch className="h-5 w-5 shrink-0 text-stone-500" /> : <FileText className="h-5 w-5 shrink-0 text-stone-500" />}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-stone-900 dark:text-white">{item.title}</span>
                      <span className="text-xs text-stone-500">{item.kind === "flow" ? "Diagram" : "Document"} · {new Date(item.updated).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">Documents and diagrams you edit show up here. <Link to="/workspace" className="font-semibold text-stone-900 underline dark:text-white">Start a document</Link> or <Link to="/flow" className="font-semibold text-stone-900 underline dark:text-white">a diagram</Link>.</p>
          )}
        </Card>

        <Card title="Next 7 days" action={<CalendarClock className="h-5 w-5 text-stone-400" />}>
          {agenda.length ? (
            <ol className="space-y-4">
              {agenda.map((entry) => (
                <li key={entry.key}>
                  <p className="mb-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400">{entry.key === toDay(now) ? "Today" : entry.day.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}</p>
                  <ul className="space-y-1">
                    {entry.tasks.map((task) => (
                      <li key={task.id}><Link to={`/sticker?task=${task.id}`} className="flex items-center gap-2 text-sm text-stone-700 hover:text-stone-950 dark:text-stone-300"><span className={`h-2 w-2 shrink-0 rounded-full ${urgencyMeta(urgencyOf(task)).dot}`} /><span className="truncate">{task.title}</span></Link></li>
                    ))}
                    {entry.bills.map((bill) => (
                      <li key={bill.id}><Link to="/finance/bills" className="flex items-center gap-2 text-sm text-stone-700 hover:text-stone-950 dark:text-stone-300"><Wallet className="h-3.5 w-3.5 shrink-0 text-stone-400" /><span className="truncate">{bill.title}</span><span className="ml-auto text-xs font-semibold tabular-nums text-stone-500">{money(bill.amount)}</span></Link></li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-stone-500">No deadlines or bills this week.</p>}
        </Card>
      </div>
    </main>
  );
}
