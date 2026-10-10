import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { addMonths, startOfYear, subDays } from "date-fns";
import { ArrowLeftRight, Download, Plus, Printer, Receipt, Search, Trash2, Upload } from "lucide-react";
import Papa from "papaparse";
import { useConfirm } from "../../../components/ui/ConfirmDialog";
import { useMoneyFormat } from "../../../lib/profile";
import { useFinance } from "../FinanceStore";
import { monthRange, sumAmounts, toDay } from "../calc";
import TransactionForm from "../components/TransactionForm";
import CsvImportDialog from "../components/CsvImportDialog";
import { Amount, buttonPrimary, buttonSecondary, EmptyState, inputClass } from "../components/ui";

const PERIODS = [
  { id: "month", label: "This month", range: () => monthRange(new Date()) },
  { id: "last-month", label: "Last month", range: () => monthRange(addMonths(new Date(), -1)) },
  { id: "90", label: "Last 90 days", range: () => ({ start: toDay(subDays(new Date(), 89)), end: toDay(new Date()) }) },
  { id: "year", label: "This year", range: () => ({ start: toDay(startOfYear(new Date())), end: toDay(new Date()) }) },
  { id: "all", label: "All time", range: () => ({ start: "0000-01-01", end: "9999-12-31" }) },
];

function downloadCsv(filename, rows) {
  const blob = new Blob([Papa.unparse(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}

export default function TransactionsTab() {
  const { transactions, accounts, categories, remove, update } = useFinance();
  const money = useMoneyFormat();
  const confirm = useConfirm();
  // ?q= (from search) opens with that text across all time.
  const [params] = useSearchParams();
  const [period, setPeriod] = useState(() => (params.get("q") ? "all" : "month"));
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [kind, setKind] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [editing, setEditing] = useState(null); // transaction | "new"
  const [importing, setImporting] = useState(false);

  const accountName = (id) => accounts.find((account) => account.id === id)?.name ?? "—";
  const category = (id) => categories.find((item) => item.id === id);

  const filtered = useMemo(() => {
    const range = PERIODS.find((item) => item.id === period).range();
    const needle = query.trim().toLowerCase();
    return transactions.filter((tx) =>
      tx.occurred_on >= range.start && tx.occurred_on <= range.end
      && (!accountId || tx.account_id === accountId || tx.transfer_account_id === accountId)
      && (!categoryId || (categoryId === "none" ? !tx.category_id : tx.category_id === categoryId))
      && (!kind || tx.kind === kind)
      && (!needle || `${tx.title} ${tx.notes ?? ""}`.toLowerCase().includes(needle)));
  }, [transactions, period, query, accountId, categoryId, kind]);

  const totals = {
    income: sumAmounts(filtered.filter((tx) => tx.kind === "income")),
    expense: sumAmounts(filtered.filter((tx) => tx.kind === "expense")),
  };
  const allSelected = filtered.length > 0 && filtered.every((tx) => selected.has(tx.id));
  const toggle = (id) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const deleteOne = async (tx) => {
    if (!(await confirm({ title: "Delete transaction?", message: `"${tx.title}" (${money(tx.amount)}) will be removed.`, destructive: true }))) return;
    await remove("transactions", tx.id);
    setEditing(null);
  };

  const deleteSelected = async () => {
    const ids = [...selected];
    if (!(await confirm({ title: `Delete ${ids.length} transactions?`, message: "This can't be undone.", destructive: true }))) return;
    await remove("transactions", ids);
    setSelected(new Set());
  };

  const recategorize = async (newCategoryId) => {
    for (const id of selected) {
      const tx = transactions.find((item) => item.id === id);
      if (tx && tx.kind !== "transfer") await update("transactions", id, { category_id: newCategoryId || null });
    }
    setSelected(new Set());
  };

  const exportCsv = () => downloadCsv(`taskr-transactions-${toDay(new Date())}.csv`, filtered.map((tx) => ({
    Date: tx.occurred_on,
    Description: tx.title,
    Type: tx.kind,
    Category: category(tx.category_id)?.name ?? "",
    Account: accountName(tx.account_id),
    "To account": tx.transfer_account_id ? accountName(tx.transfer_account_id) : "",
    Amount: tx.kind === "expense" ? -tx.amount : tx.amount,
    Notes: tx.notes ?? "",
  })));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search transactions" className={`${inputClass} pl-9`} aria-label="Search transactions" />
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className={`${inputClass} w-auto`} aria-label="Period">{PERIODS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={`${inputClass} w-auto`} aria-label="Type">
          <option value="">All types</option><option value="expense">Expenses</option><option value="income">Income</option><option value="transfer">Transfers</option>
        </select>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={`${inputClass} w-auto`} aria-label="Account">
          <option value="">All accounts</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`${inputClass} w-auto`} aria-label="Category">
          <option value="">All categories</option><option value="none">Uncategorised</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {filtered.length} transactions · <span className="font-semibold text-emerald-600 dark:text-emerald-400">{money(totals.income)} in</span> · <span className="font-semibold text-slate-700 dark:text-slate-200">{money(totals.expense)} out</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setImporting(true)} className={buttonSecondary}><Upload className="h-4 w-4" /> Import CSV</button>
          <button type="button" onClick={exportCsv} disabled={!filtered.length} className={buttonSecondary}><Download className="h-4 w-4" /> Export</button>
          <button type="button" onClick={() => window.print()} disabled={!filtered.length} className={buttonSecondary}><Printer className="h-4 w-4" /> Print</button>
          <button type="button" onClick={() => setEditing("new")} className={buttonPrimary}><Plus className="h-4 w-4" /> Add</button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm dark:border-blue-500/30 dark:bg-blue-500/10 print:hidden">
          <span className="font-semibold text-blue-800 dark:text-blue-200">{selected.size} selected</span>
          <select onChange={(e) => { if (e.target.value !== "__") recategorize(e.target.value); }} value="__" className="rounded-lg border border-blue-200 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-white/5 dark:text-slate-200" aria-label="Recategorise selected">
            <option value="__">Set category…</option><option value="">Uncategorised</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <button type="button" onClick={deleteSelected} className="inline-flex items-center gap-1 text-xs font-bold text-red-600"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-xs font-semibold text-slate-500">Clear</button>
        </div>
      )}

      {filtered.length ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0f1733] print:border-slate-300">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 dark:border-white/10 dark:text-slate-400">
              <tr>
                <th className="w-10 px-4 py-3 print:hidden"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(filtered.map((tx) => tx.id)))} aria-label="Select all" className="accent-blue-600" /></th>
                <th className="px-3 py-3 font-bold">Date</th>
                <th className="px-3 py-3 font-bold">Description</th>
                <th className="px-3 py-3 font-bold">Category</th>
                <th className="px-3 py-3 font-bold">Account</th>
                <th className="px-4 py-3 text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filtered.map((tx) => {
                const cat = category(tx.category_id);
                return (
                  <tr key={tx.id} onClick={() => setEditing(tx)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                    <td className="px-4 py-3 print:hidden" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.has(tx.id)} onChange={() => toggle(tx.id)} aria-label={`Select ${tx.title}`} className="accent-blue-600" /></td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">{new Date(`${tx.occurred_on}T00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{tx.title}</div>
                      {tx.notes && <div className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{tx.notes}</div>}
                    </td>
                    <td className="px-3 py-3">
                      {tx.kind === "transfer" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-300"><ArrowLeftRight className="h-3 w-3" /> Transfer</span>
                      ) : cat ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color ?? "#64748b" }} />{cat.name}</span>
                      ) : <span className="text-xs text-slate-400">Uncategorised</span>}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300">{accountName(tx.account_id)}{tx.transfer_account_id && ` → ${accountName(tx.transfer_account_id)}`}</td>
                    <td className="px-4 py-3 text-right"><Amount value={tx.amount} kind={tx.kind} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={Receipt} title={transactions.length ? "No transactions match" : "No transactions yet"} action={<button type="button" onClick={() => setEditing("new")} className={buttonPrimary}><Plus className="h-4 w-4" /> Add your first</button>}>
          {transactions.length ? "Try a different period or filter." : "Record income and spending by hand, or import a bank statement CSV."}
        </EmptyState>
      )}

      {editing && <TransactionForm transaction={editing === "new" ? null : editing} onClose={() => setEditing(null)} onDelete={deleteOne} />}
      {importing && <CsvImportDialog onClose={() => setImporting(false)} />}
    </div>
  );
}
