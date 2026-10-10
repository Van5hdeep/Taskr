import { useState } from "react";
import { Archive, Flag, PartyPopper, Pencil, PiggyBank, Plus } from "lucide-react";
import { addMonths } from "date-fns";
import Modal from "../../../components/ui/Modal";
import { useConfirm } from "../../../components/ui/ConfirmDialog";
import { useMoneyFormat } from "../../../lib/profile";
import { useFinance } from "../FinanceStore";
import { goalMonthlyNeed, goalSaved, parseDay, sumAmounts, toDay, toMinor } from "../calc";
import TransactionForm from "../components/TransactionForm";
import { buttonGhost, buttonPrimary, buttonSecondary, Card, EmptyState, Field, inputClass, MoneyInput, ProgressBar } from "../components/ui";

const GOAL_COLORS = ["#2563eb", "#16a34a", "#f97316", "#a855f7", "#ec4899", "#0891b2"];

function GoalForm({ goal, onClose }) {
  const { create, update } = useFinance();
  const [form, setForm] = useState({
    name: goal?.name ?? "",
    target_amount: goal ? String(goal.target_amount) : "",
    target_date: goal?.target_date ?? "",
    color: goal?.color ?? GOAL_COLORS[0],
  });
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !(Number(form.target_amount) > 0)) return;
    setSaving(true);
    const row = { name: form.name.trim(), target_amount: Number(form.target_amount), target_date: form.target_date || null, color: form.color };
    try {
      if (goal) await update("goals", goal.id, row);
      else await create("goals", row);
      onClose();
    } catch { setSaving(false); }
  };

  return (
    <Modal title={goal ? "Edit goal" : "New savings goal"} onClose={onClose} size="sm" footer={<><button type="button" onClick={onClose} className={buttonGhost}>Cancel</button><button type="submit" form="goal-form" disabled={saving} className={buttonPrimary}>Save</button></>}>
      <form id="goal-form" onSubmit={submit} className="space-y-4">
        <Field label="Goal"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Emergency fund, laptop, Goa trip…" required autoFocus /></Field>
        <Field label="Target amount"><MoneyInput value={form.target_amount} onChange={(target_amount) => setForm({ ...form, target_amount })} required /></Field>
        <Field label="Target date" hint="Optional. With a date, TASKR tells you how much to set aside each month."><input type="date" className={inputClass} value={form.target_date} min={toDay(new Date())} onChange={(e) => setForm({ ...form, target_date: e.target.value })} /></Field>
        <div className="flex gap-2">{GOAL_COLORS.map((color) => <button key={color} type="button" onClick={() => setForm({ ...form, color })} aria-label={`Colour ${color}`} className={`h-7 w-7 rounded-full ${form.color === color ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#0e1532]" : ""}`} style={{ backgroundColor: color }} />)}</div>
      </form>
    </Modal>
  );
}

/** Average of the last three months' contributions → projected completion month. */
function projection(goal, saved, transactions) {
  const since = toDay(addMonths(new Date(), -3));
  const recent = sumAmounts(transactions.filter((tx) => tx.goal_id === goal.id && tx.occurred_on >= since));
  const perMonth = recent / 3;
  const remaining = Number(goal.target_amount) - saved;
  if (remaining <= 0 || perMonth <= 0) return null;
  return addMonths(new Date(), Math.ceil(remaining / perMonth));
}

export default function GoalsTab() {
  const { goals, transactions, accounts, update } = useFinance();
  const money = useMoneyFormat();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const [contributing, setContributing] = useState(null);
  const active = goals.filter((goal) => !goal.archived_at);

  const archive = async (goal) => {
    if (!(await confirm({ title: `Archive "${goal.name}"?`, message: "Its contributions stay in your transactions.", confirmText: "Archive" }))) return;
    await update("goals", goal.id, { archived_at: new Date().toISOString() });
  };

  const savingsAccount = accounts.find((account) => !account.is_archived && /sav/i.test(account.name));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">Money put towards a goal is a normal transaction tagged with it — usually a transfer into a savings account, so your balances stay right.</p>
        <button type="button" onClick={() => setEditing("new")} className={buttonPrimary}><Plus className="h-4 w-4" /> New goal</button>
      </div>

      {active.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {active.map((goal) => {
            const saved = goalSaved(goal, transactions);
            const ratio = saved / Number(goal.target_amount);
            const need = goalMonthlyNeed(goal, saved);
            const done = toMinor(saved) >= toMinor(goal.target_amount);
            const projected = projection(goal, saved, transactions);
            const late = projected && goal.target_date && projected > parseDay(goal.target_date);
            return (
              <Card key={goal.id}>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ backgroundColor: goal.color ?? "#2563eb" }}>{done ? <PartyPopper className="h-4 w-4" /> : <Flag className="h-4 w-4" />}</span>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{goal.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{goal.target_date ? `by ${parseDay(goal.target_date).toLocaleDateString(undefined, { month: "short", year: "numeric" })}` : "No deadline"}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setEditing(goal)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5" aria-label={`Edit ${goal.name}`}><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => archive(goal)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5" aria-label={`Archive ${goal.name}`}><Archive className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <p className="mb-2 text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">{money(saved)} <span className="text-sm font-semibold text-slate-400">of {money(goal.target_amount)}</span></p>
                <ProgressBar ratio={ratio} tone={done ? "bg-emerald-500" : "bg-blue-600"} />
                <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  {done ? <p className="font-bold text-emerald-600 dark:text-emerald-400">Goal reached 🎉</p> : (
                    <>
                      {need != null && <p>Set aside <strong>{money(need)}</strong> a month to make it on time.</p>}
                      {projected && <p className={late ? "font-semibold text-amber-600 dark:text-amber-400" : ""}>At your recent pace: {projected.toLocaleDateString(undefined, { month: "short", year: "numeric" })}{late ? " — behind schedule" : ""}</p>}
                    </>
                  )}
                </div>
                {!done && (
                  <button type="button" onClick={() => setContributing(goal)} className={`${buttonSecondary} mt-4 w-full`}><PiggyBank className="h-4 w-4" /> Add money</button>
                )}
                {done && !goal.achieved_at && (
                  <button type="button" onClick={() => update("goals", goal.id, { achieved_at: new Date().toISOString() })} className={`${buttonSecondary} mt-4 w-full`}>Mark as achieved</button>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={PiggyBank} title="No savings goals yet" action={<button type="button" onClick={() => setEditing("new")} className={buttonPrimary}><Plus className="h-4 w-4" /> Create a goal</button>}>
          An emergency fund, a trip, a new laptop — set a target and a date, and TASKR works out the monthly amount.
        </EmptyState>
      )}

      {editing && <GoalForm goal={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {contributing && (
        <TransactionForm
          initial={{ kind: savingsAccount ? "transfer" : "expense", goal_id: contributing.id, title: `Saved for ${contributing.name}`, transfer_account_id: savingsAccount?.id ?? "" }}
          onClose={() => setContributing(null)}
        />
      )}
    </div>
  );
}
