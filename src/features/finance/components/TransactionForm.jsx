import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import Modal from "../../../components/ui/Modal";
import { useFinance } from "../FinanceStore";
import { toDay } from "../calc";
import { buttonGhost, buttonPrimary, Field, inputClass, MoneyInput } from "./ui";

const KINDS = [
  { id: "expense", label: "Expense" },
  { id: "income", label: "Income" },
  { id: "transfer", label: "Transfer" },
];

/** Add or edit one transaction. `initial` may preset kind, goal, accounts… */
export default function TransactionForm({ transaction = null, initial = {}, onClose, onDelete }) {
  const { accounts, categories, goals, transactions, create, update } = useFinance();
  const activeAccounts = accounts.filter((account) => !account.is_archived);
  const [form, setForm] = useState(() => ({
    kind: transaction?.kind ?? initial.kind ?? "expense",
    amount: transaction ? String(transaction.amount) : initial.amount ? String(initial.amount) : "",
    title: transaction?.title ?? initial.title ?? "",
    category_id: transaction?.category_id ?? initial.category_id ?? "",
    account_id: transaction?.account_id ?? initial.account_id ?? activeAccounts[0]?.id ?? "",
    transfer_account_id: transaction?.transfer_account_id ?? initial.transfer_account_id ?? "",
    goal_id: transaction?.goal_id ?? initial.goal_id ?? "",
    occurred_on: transaction?.occurred_on ?? initial.occurred_on ?? toDay(new Date()),
    notes: transaction?.notes ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  const kindCategories = categories.filter((category) => category.kind === form.kind && !category.is_archived);

  // Autocomplete from history: picking a past title also restores its category.
  const recentTitles = useMemo(() => {
    const seen = new Map();
    for (const tx of transactions) {
      if (tx.kind === form.kind && tx.title && !seen.has(tx.title)) seen.set(tx.title, tx.category_id);
      if (seen.size >= 50) break;
    }
    return seen;
  }, [transactions, form.kind]);

  const onTitle = (title) => {
    const remembered = recentTitles.get(title);
    set({ title, ...(remembered && !form.category_id ? { category_id: remembered } : {}) });
  };

  const submit = async (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!(amount > 0)) { setError("Enter an amount above zero."); return; }
    if (!form.account_id) { setError("Choose an account."); return; }
    if (form.kind === "transfer" && (!form.transfer_account_id || form.transfer_account_id === form.account_id)) { setError("Choose two different accounts for a transfer."); return; }
    setSaving(true);
    setError(null);
    const row = {
      kind: form.kind,
      amount,
      title: form.title.trim() || (form.kind === "transfer" ? "Transfer" : KINDS.find((k) => k.id === form.kind).label),
      category_id: form.kind === "transfer" ? null : form.category_id || null,
      account_id: form.account_id,
      transfer_account_id: form.kind === "transfer" ? form.transfer_account_id : null,
      goal_id: form.goal_id || null,
      occurred_on: form.occurred_on,
      notes: form.notes.trim() || null,
    };
    try {
      if (transaction) await update("transactions", transaction.id, row);
      else await create("transactions", row);
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={transaction ? "Edit transaction" : "New transaction"}
      onClose={onClose}
      footer={(
        <>
          {transaction && onDelete && <button type="button" onClick={() => onDelete(transaction)} className={`${buttonGhost} mr-auto text-red-600`}><Trash2 className="h-4 w-4" /> Delete</button>}
          <button type="button" onClick={onClose} className={buttonGhost}>Cancel</button>
          <button type="submit" form="transaction-form" disabled={saving} className={buttonPrimary}>{saving ? "Saving…" : "Save"}</button>
        </>
      )}
    >
      <form id="transaction-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 inline-flex rounded-xl bg-slate-100 p-1 dark:bg-white/5" role="radiogroup" aria-label="Type">
          {KINDS.map((kind) => (
            <button key={kind.id} type="button" role="radio" aria-checked={form.kind === kind.id} onClick={() => set({ kind: kind.id, category_id: "" })} className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold ${form.kind === kind.id ? "bg-white text-blue-700 shadow-sm dark:bg-[#1c2650] dark:text-blue-300" : "text-slate-500"}`}>
              {kind.label}
            </button>
          ))}
        </div>
        {error && <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        <Field label="Amount"><MoneyInput value={form.amount} onChange={(amount) => set({ amount })} required autoFocus /></Field>
        <Field label="Date"><input type="date" className={inputClass} value={form.occurred_on} onChange={(e) => set({ occurred_on: e.target.value })} required /></Field>
        <Field label={form.kind === "income" ? "Source" : "Description"} className="sm:col-span-2">
          <input className={inputClass} value={form.title} onChange={(e) => onTitle(e.target.value)} list="finance-recent-titles" placeholder={form.kind === "income" ? "Salary, client, refund…" : "Groceries, rent, coffee…"} />
          <datalist id="finance-recent-titles">{[...recentTitles.keys()].map((title) => <option key={title} value={title} />)}</datalist>
        </Field>
        <Field label={form.kind === "transfer" ? "From account" : "Account"}>
          <select className={inputClass} value={form.account_id} onChange={(e) => set({ account_id: e.target.value })}>
            {activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </Field>
        {form.kind === "transfer" ? (
          <Field label="To account">
            <select className={inputClass} value={form.transfer_account_id} onChange={(e) => set({ transfer_account_id: e.target.value })}>
              <option value="">Choose…</option>
              {activeAccounts.filter((account) => account.id !== form.account_id).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </Field>
        ) : (
          <Field label="Category">
            <select className={inputClass} value={form.category_id} onChange={(e) => set({ category_id: e.target.value })}>
              <option value="">Uncategorised</option>
              {kindCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </Field>
        )}
        {goals.some((goal) => !goal.archived_at) && (
          <Field label="Counts towards goal" hint="Optional — progress on a savings goal.">
            <select className={inputClass} value={form.goal_id} onChange={(e) => set({ goal_id: e.target.value })}>
              <option value="">None</option>
              {goals.filter((goal) => !goal.archived_at).map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Notes" className="sm:col-span-2"><input className={inputClass} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Optional" /></Field>
      </form>
    </Modal>
  );
}
