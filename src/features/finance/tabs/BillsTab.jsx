import { useState } from "react";
import { CalendarClock, Check, Pause, Pencil, Play, Plus, SkipForward, Trash2 } from "../../../lib/icons";
import { toast } from "sonner";
import Modal from "../../../components/ui/Modal";
import { useConfirm } from "../../../components/ui/ConfirmDialog";
import { useMoneyFormat } from "../../../lib/profile";
import { formatSupabaseError } from "../../../lib/supabase";
import { useFinance } from "../FinanceStore";
import { CADENCES, monthlyEquivalent, parseDay, sumAmounts, toDay } from "../calc";
import { buttonGhost, buttonPrimary, Card, EmptyState, Field, inputClass, MoneyInput } from "../components/ui";

const DAY = 24 * 60 * 60 * 1000;
const SINGULAR = { weekly: "week", monthly: "month", quarterly: "quarter", yearly: "year" };
const PLURAL = { weekly: "weeks", monthly: "months", quarterly: "quarters", yearly: "years" };

function dueLabel(day) {
  const diff = Math.round((parseDay(day) - parseDay(toDay(new Date()))) / DAY);
  if (diff < 0) return { text: `${-diff} day${diff === -1 ? "" : "s"} overdue`, tone: "text-red-600 dark:text-red-400 font-bold" };
  if (diff === 0) return { text: "Due today", tone: "text-amber-600 dark:text-amber-400 font-bold" };
  if (diff === 1) return { text: "Due tomorrow", tone: "text-amber-600 dark:text-amber-400" };
  if (diff <= 7) return { text: `Due in ${diff} days`, tone: "text-stone-700 dark:text-stone-300" };
  return { text: parseDay(day).toLocaleDateString(undefined, { day: "numeric", month: "short" }), tone: "text-stone-500 dark:text-stone-400" };
}

export function RecurringForm({ item, initial = {}, onClose }) {
  const { accounts, categories, create, update } = useFinance();
  const [form, setForm] = useState(() => ({
    title: item?.title ?? initial.title ?? "",
    kind: item?.kind ?? initial.kind ?? "expense",
    amount: item ? String(item.amount) : initial.amount ? String(initial.amount) : "",
    cadence: item?.cadence ?? initial.cadence ?? "monthly",
    interval_count: item?.interval_count ?? 1,
    next_due_on: item?.next_due_on ?? initial.next_due_on ?? toDay(new Date()),
    account_id: item?.account_id ?? accounts.find((account) => !account.is_archived)?.id ?? "",
    category_id: item?.category_id ?? initial.category_id ?? "",
    is_subscription: item?.is_subscription ?? initial.is_subscription ?? false,
    remind_days_before: item?.remind_days_before ?? 2,
  }));
  const [saving, setSaving] = useState(false);
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !(Number(form.amount) > 0)) return;
    setSaving(true);
    const row = {
      ...form,
      title: form.title.trim(),
      amount: Number(form.amount),
      interval_count: Math.max(1, Number(form.interval_count) || 1),
      account_id: form.account_id || null,
      category_id: form.category_id || null,
      remind_days_before: Number(form.remind_days_before) || 0,
    };
    try {
      if (item) await update("recurring", item.id, row);
      else await create("recurring", row);
      onClose();
    } catch { setSaving(false); }
  };

  return (
    <Modal title={item ? "Edit recurring item" : "New bill, subscription or income"} onClose={onClose} footer={<><button type="button" onClick={onClose} className={buttonGhost}>Cancel</button><button type="submit" form="recurring-form" disabled={saving} className={buttonPrimary}>Save</button></>}>
      <form id="recurring-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2"><input className={inputClass} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Rent, Netflix, electricity, salary, SIP…" required autoFocus /></Field>
        <Field label="Type">
          <select className={inputClass} value={form.kind} onChange={(e) => set({ kind: e.target.value, category_id: "" })}><option value="expense">Money out</option><option value="income">Money in</option></select>
        </Field>
        <Field label="Amount"><MoneyInput value={form.amount} onChange={(amount) => set({ amount })} required /></Field>
        <Field label="Repeats">
          <div className="flex gap-2">
            <select className={inputClass} value={form.interval_count} onChange={(e) => set({ interval_count: Number(e.target.value) })} aria-label="Every">
              {[1, 2, 3, 6].map((n) => <option key={n} value={n}>{n === 1 ? "Every" : `Every ${n}`}</option>)}
            </select>
            <select className={inputClass} value={form.cadence} onChange={(e) => set({ cadence: e.target.value })} aria-label="Cadence">
              {CADENCES.map((cadence) => <option key={cadence.id} value={cadence.id}>{form.interval_count > 1 ? PLURAL[cadence.id] : SINGULAR[cadence.id]}</option>)}
            </select>
          </div>
        </Field>
        <Field label="Next due"><input type="date" className={inputClass} value={form.next_due_on} onChange={(e) => set({ next_due_on: e.target.value })} required /></Field>
        <Field label="Account">
          <select className={inputClass} value={form.account_id} onChange={(e) => set({ account_id: e.target.value })}>
            <option value="">Choose when paying</option>{accounts.filter((account) => !account.is_archived).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </Field>
        <Field label="Category">
          <select className={inputClass} value={form.category_id} onChange={(e) => set({ category_id: e.target.value })}>
            <option value="">Uncategorised</option>{categories.filter((category) => category.kind === form.kind && !category.is_archived).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </Field>
        <Field label="Remind me" hint="Shown on Overview and Home before it's due.">
          <select className={inputClass} value={form.remind_days_before} onChange={(e) => set({ remind_days_before: Number(e.target.value) })}>
            {[0, 1, 2, 3, 5, 7].map((days) => <option key={days} value={days}>{days ? `${days} day${days > 1 ? "s" : ""} before` : "On the day"}</option>)}
          </select>
        </Field>
        {form.kind === "expense" && (
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-stone-700 dark:text-stone-300">
            <input type="checkbox" checked={form.is_subscription} onChange={(e) => set({ is_subscription: e.target.checked })} className="accent-amber-600" /> This is a subscription
          </label>
        )}
      </form>
    </Modal>
  );
}

export default function BillsTab() {
  const { recurring, accounts, markRecurringPaid, skipRecurring, update, remove } = useFinance();
  const money = useMoneyFormat();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);

  const active = recurring.filter((item) => item.is_active).sort((a, b) => a.next_due_on.localeCompare(b.next_due_on));
  const paused = recurring.filter((item) => !item.is_active);
  const monthlyOut = sumAmounts(active.filter((item) => item.kind === "expense"), monthlyEquivalent);
  const monthlyIn = sumAmounts(active.filter((item) => item.kind === "income"), monthlyEquivalent);
  const subscriptions = active.filter((item) => item.is_subscription);
  const subscriptionMonthly = sumAmounts(subscriptions, monthlyEquivalent);

  const pay = async (item, accountId) => {
    try {
      await markRecurringPaid(item, { accountId });
      toast.success(`${item.kind === "income" ? "Received" : "Paid"} ${item.title} · ${money(item.amount)}`);
      setPaying(null);
    } catch (err) {
      if (err?.message?.includes("Choose an account")) setPaying(item);
      else toast.error(formatSupabaseError(err));
    }
  };

  const removeItem = async (item) => {
    if (!(await confirm({ title: `Delete "${item.title}"?`, message: "Past payments stay in your transactions.", destructive: true }))) return;
    await remove("recurring", item.id);
  };

  const row = (item) => {
    const due = dueLabel(item.next_due_on);
    return (
      <li key={item.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${item.is_active ? "" : "opacity-60"}`}>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.kind === "income" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15" : "bg-amber-50 text-amber-700 dark:bg-amber-500/15"}`}><CalendarClock className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-stone-900 dark:text-white">{item.title} {item.is_subscription && <span className="ml-1 rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-500 dark:bg-white/10">subscription</span>}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {CADENCES.find((cadence) => cadence.id === item.cadence)?.label}{item.interval_count > 1 ? ` ×${item.interval_count}` : ""} · {accounts.find((account) => account.id === item.account_id)?.name ?? "No account"}
            {item.is_active && <> · <span className={due.tone}>{due.text}</span></>}
          </p>
        </div>
        <span className={`text-sm font-extrabold tabular-nums ${item.kind === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-stone-900 dark:text-white"}`}>{item.kind === "income" ? "+" : ""}{money(item.amount)}</span>
        <div className="flex gap-1">
          {item.is_active && (
            <>
              <button type="button" onClick={() => pay(item, item.account_id)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"><Check className="h-3.5 w-3.5" /> {item.kind === "income" ? "Received" : "Paid"}</button>
              <button type="button" onClick={() => skipRecurring(item)} title="Skip this one" className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5"><SkipForward className="h-4 w-4" /></button>
            </>
          )}
          <button type="button" onClick={() => update("recurring", item.id, { is_active: !item.is_active })} title={item.is_active ? "Pause" : "Resume"} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5">{item.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
          <button type="button" onClick={() => setEditing(item)} title="Edit" className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5"><Pencil className="h-4 w-4" /></button>
          <button type="button" onClick={() => removeItem(item)} title="Delete" className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /></button>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Fixed costs / month</p><p className="mt-1 text-xl font-extrabold tabular-nums text-stone-900 dark:text-white">{money(monthlyOut)}</p></Card>
        <Card><p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Subscriptions / month</p><p className="mt-1 text-xl font-extrabold tabular-nums text-stone-900 dark:text-white">{money(subscriptionMonthly)}</p><p className="text-xs text-stone-500">{subscriptions.length} active · {money(subscriptionMonthly * 12)} a year</p></Card>
        <Card><p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Recurring income / month</p><p className="mt-1 text-xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">{money(monthlyIn)}</p></Card>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={() => setEditing("new")} className={buttonPrimary}><Plus className="h-4 w-4" /> Add recurring</button>
      </div>

      {recurring.length ? (
        <>
          <Card title="Upcoming" className="p-0 [&>header]:px-5 [&>header]:pt-5">
            <ul className="divide-y divide-stone-100 dark:divide-white/5">{active.map(row)}</ul>
            {!active.length && <p className="px-5 pb-5 text-sm text-stone-500">Nothing active.</p>}
          </Card>
          {paused.length > 0 && (
            <Card title="Paused" className="p-0 [&>header]:px-5 [&>header]:pt-5"><ul className="divide-y divide-stone-100 dark:divide-white/5">{paused.map(row)}</ul></Card>
          )}
        </>
      ) : (
        <EmptyState icon={CalendarClock} title="No bills or subscriptions yet" action={<button type="button" onClick={() => setEditing("new")} className={buttonPrimary}><Plus className="h-4 w-4" /> Add your first</button>}>
          Add rent, EMIs, utilities, subscriptions, SIPs and salary. taskr reminds you before they're due and counts them in safe-to-spend.
        </EmptyState>
      )}

      {editing && <RecurringForm item={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {paying && (
        <Modal title={`Which account for ${paying.title}?`} onClose={() => setPaying(null)} size="sm">
          <div className="grid gap-2">
            {accounts.filter((account) => !account.is_archived).map((account) => (
              <button key={account.id} type="button" onClick={async () => { await update("recurring", paying.id, { account_id: account.id }); await pay({ ...paying, account_id: account.id }, account.id); }} className="rounded-xl border border-stone-200 px-4 py-3 text-left text-sm font-semibold hover:border-amber-400 dark:border-white/10 dark:text-stone-200">{account.name}</button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
