import { useMemo, useState } from "react";
import { Pencil, Plus, Settings2, Target, Trash2 } from "../../../lib/icons";
import Modal from "../../../components/ui/Modal";
import { useConfirm } from "../../../components/ui/ConfirmDialog";
import { useMoneyFormat } from "../../../lib/profile";
import { useFinance } from "../FinanceStore";
import { budgetUsage, monthRange, spentByCategory } from "../calc";
import { CATEGORY_COLORS } from "../defaults";
import { buttonGhost, buttonPrimary, buttonSecondary, Card, EmptyState, Field, inputClass, MoneyInput, ProgressBar } from "../components/ui";

function BudgetForm({ budget, presetCategoryId, onClose }) {
  const { budgets, categories, create, update } = useFinance();
  const [categoryId, setCategoryId] = useState(budget ? budget.category_id ?? "" : presetCategoryId ?? "");
  const [amount, setAmount] = useState(budget ? String(budget.amount) : "");
  const [rollover, setRollover] = useState(budget?.rollover ?? false);
  const [saving, setSaving] = useState(false);
  const taken = new Set(budgets.filter((item) => item.id !== budget?.id).map((item) => item.category_id ?? ""));

  const submit = async (event) => {
    event.preventDefault();
    if (!(Number(amount) >= 0) || amount === "") return;
    setSaving(true);
    const row = { category_id: categoryId || null, amount: Number(amount), rollover };
    try {
      if (budget) await update("budgets", budget.id, row);
      else await create("budgets", row);
      onClose();
    } catch { setSaving(false); }
  };

  return (
    <Modal title={budget ? "Edit budget" : "New monthly budget"} onClose={onClose} size="sm" footer={<><button type="button" onClick={onClose} className={buttonGhost}>Cancel</button><button type="submit" form="budget-form" disabled={saving} className={buttonPrimary}>Save</button></>}>
      <form id="budget-form" onSubmit={submit} className="space-y-4">
        <Field label="For">
          <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={Boolean(budget)}>
            <option value="" disabled={taken.has("")}>All spending (overall)</option>
            {categories.filter((category) => category.kind === "expense" && !category.is_archived).map((category) => <option key={category.id} value={category.id} disabled={taken.has(category.id)}>{category.name}</option>)}
          </select>
        </Field>
        <Field label="Monthly limit"><MoneyInput value={amount} onChange={setAmount} required autoFocus /></Field>
        <label className="flex items-start gap-2 text-sm text-stone-700 dark:text-stone-300">
          <input type="checkbox" checked={rollover} onChange={(e) => setRollover(e.target.checked)} className="mt-1 accent-amber-600" />
          <span><strong>Roll over</strong> unspent money from last month into this month.</span>
        </label>
      </form>
    </Modal>
  );
}

function CategoryManager({ onClose }) {
  const { categories, transactions, create, update, remove } = useFinance();
  const confirm = useConfirm();
  const [kind, setKind] = useState("expense");
  const [name, setName] = useState("");
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const list = categories.filter((category) => category.kind === kind);

  const add = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      await create("categories", { name: name.trim(), kind, color, position: list.length });
      setName("");
    } catch { /* toast shown */ }
  };

  const removeCategory = async (category) => {
    const used = transactions.filter((tx) => tx.category_id === category.id).length;
    const message = used
      ? `${used} transaction${used === 1 ? "" : "s"} use it; they'll stay but show no category. Any budget for it is removed.`
      : "This can't be undone.";
    if (!(await confirm({ title: `Delete "${category.name}"?`, message, confirmText: "Delete", destructive: true }))) return;
    await remove("categories", category.id);
  };

  return (
    <Modal title="Categories" onClose={onClose}>
      <div className="mb-4 inline-flex rounded-xl bg-stone-100 p-1 dark:bg-white/5">
        {["expense", "income"].map((item) => <button key={item} type="button" onClick={() => setKind(item)} className={`rounded-lg px-4 py-1.5 text-xs font-bold capitalize ${kind === item ? "bg-white text-amber-800 shadow-sm dark:bg-ink-800 dark:text-amber-300" : "text-stone-500"}`}>{item}</button>)}
      </div>
      <ul className="mb-4 space-y-1">
        {list.map((category) => (
          <li key={category.id} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-stone-50 dark:hover:bg-white/5 ${category.is_archived ? "opacity-50" : ""}`}>
            <input type="color" value={category.color ?? "#64748b"} onChange={(e) => update("categories", category.id, { color: e.target.value })} className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0" aria-label={`Colour for ${category.name}`} />
            <input defaultValue={category.name} onBlur={(e) => { const value = e.target.value.trim(); if (value && value !== category.name) update("categories", category.id, { name: value }).catch(() => { e.target.value = category.name; }); }} className="flex-1 bg-transparent text-sm text-stone-800 outline-none focus:underline dark:text-stone-200" aria-label="Category name" />
            {category.is_archived ? (
              <button type="button" onClick={() => update("categories", category.id, { is_archived: false })} className="text-xs font-semibold text-amber-700">Restore</button>
            ) : (
              <button type="button" onClick={() => removeCategory(category)} className="rounded p-1 text-stone-400 hover:text-red-500" aria-label={`Remove ${category.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="flex items-center gap-2">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-9 cursor-pointer rounded-lg border border-stone-200 bg-transparent p-1 dark:border-white/10" aria-label="New category colour" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${kind} category`} className={inputClass} />
        <button type="submit" disabled={!name.trim()} className={buttonPrimary}><Plus className="h-4 w-4" /></button>
      </form>
    </Modal>
  );
}

export default function BudgetsTab() {
  const { budgets, categories, transactions, remove } = useFinance();
  const money = useMoneyFormat();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null); // budget | { new: true, categoryId }
  const [managing, setManaging] = useState(false);

  const monthLabel = new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const spent = useMemo(() => spentByCategory(transactions, monthRange(new Date())), [transactions]);
  const rows = budgets
    .map((budget) => ({ budget, usage: budgetUsage(budget, transactions), category: categories.find((item) => item.id === budget.category_id) }))
    .sort((a, b) => (a.budget.category_id == null ? -1 : b.budget.category_id == null ? 1 : b.usage.ratio - a.usage.ratio));
  const unbudgeted = categories.filter((category) => category.kind === "expense" && !category.is_archived && !budgets.some((budget) => budget.category_id === category.id) && spent[category.id]);

  const deleteBudget = async (budget, label) => {
    if (!(await confirm({ title: `Remove the ${label} budget?`, destructive: true, confirmText: "Remove" }))) return;
    await remove("budgets", budget.id);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-500 dark:text-stone-400">Monthly limits for <strong className="text-stone-800 dark:text-stone-200">{monthLabel}</strong>. They repeat every month.</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setManaging(true)} className={buttonSecondary}><Settings2 className="h-4 w-4" /> Categories</button>
          <button type="button" onClick={() => setEditing({ new: true })} className={buttonPrimary}><Plus className="h-4 w-4" /> Add budget</button>
        </div>
      </div>

      {rows.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map(({ budget, usage, category }) => {
            const label = budget.category_id == null ? "Overall" : category?.name ?? "Deleted category";
            return (
              <Card key={budget.id}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category?.color ?? "#2563eb" }} />
                    <span className="text-sm font-bold text-stone-900 dark:text-white">{label}</span>
                    {budget.rollover && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-500 dark:bg-white/10">rollover</span>}
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setEditing(budget)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5" aria-label={`Edit ${label} budget`}><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => deleteBudget(budget, label)} className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30" aria-label={`Remove ${label} budget`}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <ProgressBar ratio={usage.ratio} />
                <div className="mt-2 flex justify-between text-xs">
                  <span className="font-semibold text-stone-700 dark:text-stone-300">{money(usage.spent)} of {money(usage.limit)}</span>
                  <span className={usage.remaining < 0 ? "font-bold text-red-600 dark:text-red-400" : "text-stone-500 dark:text-stone-400"}>{usage.remaining < 0 ? `${money(-usage.remaining)} over` : `${money(usage.remaining)} left`}</span>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={Target} title="No budgets yet" action={<button type="button" onClick={() => setEditing({ new: true })} className={buttonPrimary}><Plus className="h-4 w-4" /> Set a budget</button>}>
          Start with one overall monthly limit, or cap the categories you overspend in.
        </EmptyState>
      )}

      {unbudgeted.length > 0 && (
        <Card title="Spending without a budget this month">
          <ul className="divide-y divide-stone-100 dark:divide-white/5">
            {unbudgeted.map((category) => (
              <li key={category.id} className="flex items-center justify-between py-2 text-sm">
                <span className="flex items-center gap-2 text-stone-700 dark:text-stone-300"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />{category.name}</span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums text-stone-900 dark:text-white">{money(spent[category.id])}</span>
                  <button type="button" onClick={() => setEditing({ new: true, categoryId: category.id })} className="text-xs font-bold text-amber-700 hover:underline">Set budget</button>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {editing && <BudgetForm budget={editing.new ? null : editing} presetCategoryId={editing.categoryId} onClose={() => setEditing(null)} />}
      {managing && <CategoryManager onClose={() => setManaging(false)} />}
    </div>
  );
}
