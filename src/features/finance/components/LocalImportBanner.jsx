import { useMemo, useState } from "react";
import { HardDriveDownload, Loader2, X } from "../../../lib/icons";
import { toast } from "sonner";
import { formatSupabaseError } from "../../../lib/supabase";
import { useFinance } from "../FinanceStore";
import { fromMinor, toMinor } from "../calc";
import { DEFAULT_CATEGORIES } from "../defaults";

const DISMISS_KEY = "taskr_finance_local_import_dismissed";

/**
 * Finds finance data the old localStorage-only version saved in this browser
 * (taskr_finance_{transactions,balance,budget}[_<suffix>]).
 */
function findLocalData() {
  const sets = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      const match = key?.match(/^taskr_finance_transactions(_.+)?$/);
      if (!match || key.endsWith("_imported")) continue;
      const suffix = match[1] ?? "";
      let transactions = [];
      try { transactions = JSON.parse(localStorage.getItem(key) || "[]"); } catch { transactions = []; }
      const balance = Number.parseFloat(localStorage.getItem(`taskr_finance_balance${suffix}`) ?? "0") || 0;
      const budget = Number.parseFloat(localStorage.getItem(`taskr_finance_budget${suffix}`) ?? "0") || 0;
      if (Array.isArray(transactions) && (transactions.length || balance)) sets.push({ suffix, transactions, balance, budget });
    }
  } catch { /* storage unavailable */ }
  return sets;
}

function markImported(suffix) {
  for (const name of ["transactions", "balance", "budget"]) {
    const key = `taskr_finance_${name}${suffix}`;
    const value = localStorage.getItem(key);
    if (value == null) continue;
    localStorage.setItem(`${key}_imported`, value);
    localStorage.removeItem(key);
  }
}

export default function LocalImportBanner() {
  const { categories, budgets, create, createMany } = useFinance();
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return true; } });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const sets = useMemo(() => (dismissed || done ? [] : findLocalData()), [dismissed, done]);
  if (!sets.length) return null;
  const count = sets.reduce((total, set) => total + set.transactions.length, 0);

  const categoryFor = (legacyId, kind) => {
    const name = DEFAULT_CATEGORIES.find((item) => item.legacy === legacyId && item.kind === kind)?.name;
    return categories.find((category) => category.kind === kind && category.name === name)?.id ?? null;
  };

  const runImport = async () => {
    setBusy(true);
    try {
      let imported = 0;
      for (const set of sets) {
        const valid = set.transactions.filter((tx) => Number(tx.amount) > 0 && tx.date);
        // Opening balance chosen so the derived balance equals the old stored balance.
        const net = valid.reduce((total, tx) => total + (tx.type === "income" ? 1 : -1) * toMinor(tx.amount), 0);
        const account = await create("accounts", { name: "Main account", kind: "bank", opening_balance: fromMinor(toMinor(set.balance) - net) });
        await createMany("transactions", valid.map((tx) => {
          const kind = tx.type === "income" ? "income" : "expense";
          return {
            kind,
            amount: Number(tx.amount),
            occurred_on: String(tx.date).slice(0, 10),
            title: String(tx.title || (kind === "income" ? "Income" : "Expense")).slice(0, 200),
            notes: tx.notes || null,
            account_id: account.id,
            category_id: categoryFor(tx.category, kind),
          };
        }));
        if (set.budget > 0 && !budgets.some((budget) => budget.category_id == null)) {
          await create("budgets", { category_id: null, amount: set.budget, rollover: false });
        }
        markImported(set.suffix);
        imported += valid.length;
      }
      toast.success(`Imported ${imported} transactions into "Main account". The browser copy is kept as a backup.`);
      setDone(true);
    } catch (err) {
      toast.error(formatSupabaseError(err, "Import failed — nothing in your browser was changed."));
      setBusy(false);
    }
  };

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
      <HardDriveDownload className="h-5 w-5 shrink-0 text-amber-700" />
      <p className="min-w-0 flex-1 text-amber-900 dark:text-amber-100">
        <strong>Finance data found in this browser</strong> from the earlier version of taskr ({count} transactions). Import it into your account so it syncs everywhere?
      </p>
      <button type="button" onClick={runImport} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 dark:bg-amber-400 dark:text-stone-900 px-3 py-2 text-xs font-bold text-white hover:bg-stone-800 dark:hover:bg-amber-300 disabled:opacity-60">
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Import
      </button>
      <button type="button" onClick={dismiss} disabled={busy} className="rounded-lg p-1.5 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-500/20" aria-label="Don't import"><X className="h-4 w-4" /></button>
    </div>
  );
}
