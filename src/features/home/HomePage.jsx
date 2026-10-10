import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { addDays } from "date-fns";
import { CalendarClock, Check, ChevronRight, FileText, GitBranch, Loader2, Plus, Search, StickyNote, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../lib/auth/AuthProvider";
import { useMoneyFormat } from "../../lib/profile";
import { formatSupabaseError } from "../../lib/supabase";
import * as stickerApi from "../sticker/api";
import { compareTasks, quadrantOf } from "../sticker/logic";
import { formatDue } from "../sticker/format";
import { budgetUsage, monthRange, parseDay, safeToSpend, sumAmounts, toDay } from "../finance/calc";
import { openCommandPalette, openQuickCapture } from "../../app/globalEvents";
import { loadHome } from "./api";

const DAY = 24 * 60 * 60 * 1000;

function Card({ title, icon: Icon, action, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0f1733] ${className}`}>
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">{Icon && <Icon className="h-4 w-4 text-blue-600" />}{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

const More = ({ to, label = "Open" }) => <Link to={to} className="inline-flex items-center text-xs font-semibold text-blue-600 hover:underline">{label} <ChevronRight className="h-3.5 w-3.5" /></Link>;

function greeting(date) {
  const hour = date.getHours();
  return hour < 5 ? "Working late" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default function HomePage() {
  const { displayName } = useAuth();
  const money = useMoneyFormat();
  const [data, setData] = useState(null);
  const [completing, setCompleting] = useState(null);
  const now = useMemo(() => new Date(), [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(() => {
    loadHome().then(setData).catch((err) => setData({ errors: [err], tasks: [], boards: [], finance: null, documents: [], flows: [] }));
  }, []);
  useEffect(() => { load(); }, [load]);

  const focus = useMemo(() => {
    if (!data?.tasks) return [];
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    return data.tasks
      .filter((task) => (task.deadline && task.deadline <= todayEnd) || quadrantOf(task) === "do")
      .sort((a, b) => compareTasks(a, b, now.getTime()))
      .slice(0, 8);
  }, [data, now]);

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
    const isEmpty = !transactions.length && !recurring.length;
    return { safe, usage, spent, bills, isEmpty };
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
    const days = Array.from({ length: 7 }, (_, i) => { const day = new Date(now); day.setHours(0, 0, 0, 0); return new Date(day.getTime() + i * DAY); });
    return days.map((day) => {
      const key = toDay(day);
      const tasks = (data.tasks ?? []).filter((task) => task.deadline && toDay(task.deadline) === key);
      const bills = (data.finance?.recurring ?? []).filter((item) => item.next_due_on === key);
      return { day, key, tasks, bills };
    }).filter((entry) => entry.tasks.length || entry.bills.length);
  }, [data, now]);

  const boardName = (id) => data?.boards.find((board) => board.id === id)?.name;

  const complete = async (task) => {
    setCompleting(task.id);
    try {
      const spawned = await stickerApi.completeTask(task);
      setData((current) => ({ ...current, tasks: [...current.tasks.filter((item) => item.id !== task.id), ...(spawned ? [spawned] : [])] }));
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

  if (!data) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 pb-28 sm:px-6">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{greeting(now)}, {displayName}.</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={openCommandPalette} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:border-blue-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            <Search className="h-4 w-4" /> Search <kbd className="rounded bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500 dark:bg-white/10">Ctrl K</kbd>
          </button>
          <button type="button" onClick={openQuickCapture} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Quick add
          </button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Focus today" icon={Sparkles} action={<More to="/sticker" label="Sticker" />} className="lg:col-span-2">
          {data.tasks == null ? <p className="text-sm text-slate-500">Couldn't load tasks.</p> : focus.length ? (
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {focus.map((task) => {
                const overdue = task.deadline && task.deadline.getTime() < now.getTime();
                return (
                  <li key={task.id} className="flex items-center gap-3 py-2.5">
                    <button type="button" onClick={() => complete(task)} disabled={completing === task.id} aria-label={`Complete ${task.title}`} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500 dark:border-slate-500">
                      {completing === task.id ? <Loader2 className="h-3 w-3 animate-spin text-slate-400" /> : <Check className="h-3 w-3" strokeWidth={3} />}
                    </button>
                    <Link to={`/sticker?board=${task.boardId}&task=${task.id}`} className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900 hover:text-blue-700 dark:text-slate-100">{task.title}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {quadrantOf(task) === "do" && <span className="mr-2 font-semibold text-red-600 dark:text-red-400">Do first</span>}
                        {task.deadline && <span className={overdue ? "font-bold text-red-600 dark:text-red-400" : ""}>{overdue ? "Overdue · " : ""}{formatDue(task.deadline, now.getTime())}</span>}
                        {boardName(task.boardId) && <span className="ml-2 text-slate-400">· {boardName(task.boardId)}</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-white/10">
              Nothing overdue, due today or marked “Do first”.
              <button type="button" onClick={openQuickCapture} className="ml-1 font-semibold text-blue-600 hover:underline">Capture a task</button>
            </div>
          )}
        </Card>

        <Card title="Money" icon={Wallet} action={<More to="/finance" label="Finance" />}>
          {!finance ? <p className="text-sm text-slate-500">Couldn't load finance.</p> : finance.isEmpty ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              <p>Add your accounts, bills and spending to see what's safe to spend.</p>
              <Link to="/finance/accounts" className="mt-3 inline-flex rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white">Set up Finance</Link>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Safe to spend this month</p>
              <p className={`mt-1 text-3xl font-black tabular-nums ${finance.safe.amount < 0 ? "text-red-600" : "text-slate-900 dark:text-white"}`}>{finance.safe.amount < 0 ? "−" : ""}{money(Math.abs(finance.safe.amount))}</p>
              {finance.usage && (
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Spent {money(finance.spent)}</span><span>of {money(finance.usage.limit)}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className={`h-full rounded-full ${finance.usage.ratio >= 1 ? "bg-red-500" : finance.usage.ratio >= 0.8 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, finance.usage.ratio * 100)}%` }} /></div>
                </div>
              )}
              <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Bills in the next 7 days</p>
              {finance.bills.length ? (
                <ul className="space-y-2">
                  {finance.bills.slice(0, 4).map((bill) => (
                    <li key={bill.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate text-slate-700 dark:text-slate-300">{bill.title} <span className={`text-xs ${bill.next_due_on < toDay(now) ? "font-bold text-red-600" : "text-slate-400"}`}>· {bill.next_due_on < toDay(now) ? "overdue" : parseDay(bill.next_due_on).toLocaleDateString(undefined, { weekday: "short" })}</span></span>
                      <span className="font-bold tabular-nums text-slate-900 dark:text-white">{money(bill.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-500">Nothing due.</p>}
            </>
          )}
        </Card>

        <Card title="Continue" icon={FileText} className="lg:col-span-2">
          {recent.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {recent.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Link to={item.to} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-blue-300 hover:bg-blue-50/40 dark:border-white/10 dark:hover:bg-white/5">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.kind === "flow" ? "bg-violet-500/10 text-violet-600" : "bg-blue-500/10 text-blue-600"}`}>{item.kind === "flow" ? <GitBranch className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{item.title}</span>
                      <span className="text-xs text-slate-500">{item.kind === "flow" ? "Diagram" : "Document"} · {new Date(item.updated).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Documents and diagrams you edit show up here. <Link to="/workspace" className="font-semibold text-blue-600 hover:underline">Start a document</Link> or <Link to="/flow" className="font-semibold text-blue-600 hover:underline">a diagram</Link>.</p>
          )}
        </Card>

        <Card title="Next 7 days" icon={CalendarClock}>
          {agenda.length ? (
            <ol className="space-y-4">
              {agenda.map((entry) => (
                <li key={entry.key}>
                  <p className="mb-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">{entry.key === toDay(now) ? "Today" : entry.day.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}</p>
                  <ul className="space-y-1">
                    {entry.tasks.map((task) => (
                      <li key={task.id}><Link to={`/sticker?board=${task.boardId}&task=${task.id}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-blue-700 dark:text-slate-300"><StickyNote className="h-3.5 w-3.5 shrink-0 text-amber-500" /><span className="truncate">{task.title}</span><span className="ml-auto text-xs text-slate-400">{task.deadline.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span></Link></li>
                    ))}
                    {entry.bills.map((bill) => (
                      <li key={bill.id}><Link to="/finance/bills" className="flex items-center gap-2 text-sm text-slate-700 hover:text-blue-700 dark:text-slate-300"><Wallet className="h-3.5 w-3.5 shrink-0 text-emerald-600" /><span className="truncate">{bill.title}</span><span className="ml-auto text-xs font-semibold tabular-nums text-slate-500">{money(bill.amount)}</span></Link></li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-slate-500">No deadlines or bills this week.</p>}
        </Card>
      </div>
    </main>
  );
}
