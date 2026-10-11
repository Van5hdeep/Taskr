import { useMemo, useState } from "react";
import Papa from "papaparse";
import { FileSpreadsheet, Loader2 } from "../../../lib/icons";
import { toast } from "sonner";
import Modal from "../../../components/ui/Modal";
import { useMoneyFormat } from "../../../lib/profile";
import { formatSupabaseError } from "../../../lib/supabase";
import * as api from "../api";
import { useFinance } from "../FinanceStore";
import { importHash, parseAmount, parseBankDate, suggestCategory } from "../calc";
import { buttonGhost, buttonPrimary, Field, inputClass } from "./ui";

const MAPPING_KEY = "taskr_csv_mappings";

function savedMappings() {
  try { return JSON.parse(localStorage.getItem(MAPPING_KEY) || "{}"); } catch { return {}; }
}

function guessColumn(headers, patterns) {
  const index = headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)));
  return index >= 0 ? String(index) : "";
}

/**
 * Bank statement import: upload → map columns → preview with suggested
 * categories → insert only rows that weren't imported before.
 */
export default function CsvImportDialog({ onClose }) {
  const { accounts, categories, transactions, createMany } = useFinance();
  const money = useMoneyFormat();
  const [fileName, setFileName] = useState("");
  const [raw, setRaw] = useState(null); // string[][]
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState({ date: "", description: "", amountMode: "single", amount: "", debit: "", credit: "", positiveIs: "income", dayFirst: true });
  const [accountId, setAccountId] = useState(accounts.find((account) => !account.is_archived)?.id ?? "");
  const [categoryOverrides, setCategoryOverrides] = useState({});
  const [busy, setBusy] = useState(false);

  const headers = useMemo(() => {
    if (!raw?.length) return [];
    return hasHeader ? raw[0].map((cell, index) => String(cell || `Column ${index + 1}`).trim()) : raw[0].map((_, index) => `Column ${index + 1}`);
  }, [raw, hasHeader]);

  const onFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    Papa.parse(file, {
      skipEmptyLines: "greedy",
      complete: ({ data }) => {
        const rows = data.filter((row) => row.some((cell) => String(cell).trim()));
        setRaw(rows);
        const head = rows[0]?.map((cell) => String(cell).toLowerCase()) ?? [];
        const remembered = savedMappings()[head.join("|")];
        if (remembered) {
          setMapping(remembered);
        } else {
          const debit = guessColumn(head, [/debit|withdrawal|dr\b/]);
          const credit = guessColumn(head, [/credit|deposit|cr\b/]);
          setMapping((current) => ({
            ...current,
            date: guessColumn(head, [/date/]),
            description: guessColumn(head, [/narration|description|particular|details|remark/]),
            amount: guessColumn(head, [/^amount|amount/]),
            debit,
            credit,
            amountMode: debit && credit ? "split" : "single",
          }));
        }
      },
      error: (err) => toast.error(`Couldn't read that file: ${err.message}`),
    });
  };

  const parsedRows = useMemo(() => {
    if (!raw) return [];
    const body = hasHeader ? raw.slice(1) : raw;
    const occurrences = new Map();
    return body.map((row, index) => {
      const date = parseBankDate(row[mapping.date], mapping.dayFirst);
      const title = String(row[mapping.description] ?? "").trim();
      let signed = null;
      if (mapping.amountMode === "split") {
        const debit = parseAmount(row[mapping.debit]);
        const credit = parseAmount(row[mapping.credit]);
        if (credit) signed = Math.abs(credit);
        else if (debit) signed = -Math.abs(debit);
      } else {
        const value = parseAmount(row[mapping.amount]);
        signed = value == null ? null : mapping.positiveIs === "income" ? value : -value;
      }
      const valid = Boolean(date && title && signed);
      const kind = signed > 0 ? "income" : "expense";
      const amount = Math.abs(signed ?? 0);
      const baseKey = `${date}|${amount}|${title.toLowerCase()}`;
      const occurrence = occurrences.get(baseKey) ?? 0;
      occurrences.set(baseKey, occurrence + 1);
      return {
        index, valid, date, title, kind, amount,
        hash: valid ? importHash({ date, amount, title, accountId, occurrence }) : null,
        suggested: valid ? suggestCategory(title, transactions.filter((tx) => tx.kind === kind)) : null,
      };
    });
  }, [raw, hasHeader, mapping, accountId, transactions]);

  const validRows = parsedRows.filter((row) => row.valid);
  const ready = raw && accountId && mapping.date !== "" && mapping.description !== "" && (mapping.amountMode === "single" ? mapping.amount !== "" : mapping.debit !== "" || mapping.credit !== "");

  const runImport = async () => {
    setBusy(true);
    try {
      const existing = await api.existingImportHashes(validRows.map((row) => row.hash));
      const fresh = validRows.filter((row) => !existing.has(row.hash));
      await createMany("transactions", fresh.map((row) => ({
        kind: row.kind,
        amount: row.amount,
        occurred_on: row.date,
        title: row.title.slice(0, 200),
        account_id: accountId,
        category_id: (categoryOverrides[row.index] ?? row.suggested) || null,
        import_hash: row.hash,
      })));
      try {
        localStorage.setItem(MAPPING_KEY, JSON.stringify({ ...savedMappings(), [raw[0].map((cell) => String(cell).toLowerCase()).join("|")]: mapping }));
      } catch { /* mapping memory is optional */ }
      const skipped = validRows.length - fresh.length;
      toast.success(`Imported ${fresh.length} transaction${fresh.length === 1 ? "" : "s"}${skipped ? ` · ${skipped} already imported` : ""}${parsedRows.length - validRows.length ? ` · ${parsedRows.length - validRows.length} rows unreadable` : ""}`);
      onClose();
    } catch (err) {
      toast.error(formatSupabaseError(err, "Import failed."));
      setBusy(false);
    }
  };

  const columnSelect = (key, label, optional = false) => (
    <Field label={label}>
      <select className={inputClass} value={mapping[key]} onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}>
        <option value="">{optional ? "— none —" : "Choose column…"}</option>
        {headers.map((header, index) => <option key={index} value={String(index)}>{header}</option>)}
      </select>
    </Field>
  );

  return (
    <Modal
      title="Import bank statement"
      description="CSV from your bank or UPI app. Rows you've already imported are skipped automatically."
      onClose={onClose}
      size="lg"
      footer={(
        <>
          <button type="button" onClick={onClose} className={buttonGhost}>Cancel</button>
          <button type="button" onClick={runImport} disabled={!ready || !validRows.length || busy} className={buttonPrimary}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Import {validRows.length || ""} rows
          </button>
        </>
      )}
    >
      {!raw ? (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 px-6 py-14 text-center hover:border-amber-400 dark:border-white/10">
          <FileSpreadsheet className="h-8 w-8 text-amber-500" />
          <span className="text-sm font-bold text-stone-800 dark:text-stone-100">Choose a CSV file</span>
          <span className="text-xs text-stone-500">Exported from net banking or a UPI app</span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500 dark:text-stone-400">
            <span><strong className="text-stone-800 dark:text-stone-200">{fileName}</strong> · {raw.length} lines</span>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} className="accent-amber-600" /> First line is a header</label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Into account">
              <select className={inputClass} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.filter((account) => !account.is_archived).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </Field>
            {columnSelect("date", "Date column")}
            {columnSelect("description", "Description column")}
            <Field label="Amounts are in">
              <select className={inputClass} value={mapping.amountMode} onChange={(e) => setMapping({ ...mapping, amountMode: e.target.value })}>
                <option value="single">One column (+/−)</option>
                <option value="split">Separate debit & credit</option>
              </select>
            </Field>
            {mapping.amountMode === "single" ? (
              <>
                {columnSelect("amount", "Amount column")}
                <Field label="Positive amounts are">
                  <select className={inputClass} value={mapping.positiveIs} onChange={(e) => setMapping({ ...mapping, positiveIs: e.target.value })}>
                    <option value="income">Money in</option><option value="expense">Money out</option>
                  </select>
                </Field>
              </>
            ) : (
              <>
                {columnSelect("debit", "Debit (money out)", true)}
                {columnSelect("credit", "Credit (money in)", true)}
              </>
            )}
            <Field label="Date order">
              <select className={inputClass} value={mapping.dayFirst ? "dmy" : "mdy"} onChange={(e) => setMapping({ ...mapping, dayFirst: e.target.value === "dmy" })}>
                <option value="dmy">Day first (31/12/2026)</option><option value="mdy">Month first (12/31/2026)</option>
              </select>
            </Field>
          </div>

          {ready && (
            <div>
              <p className="mb-2 text-xs font-semibold text-stone-500 dark:text-stone-400">
                {validRows.length} readable rows{parsedRows.length - validRows.length ? ` · ${parsedRows.length - validRows.length} will be skipped (missing date, description or amount)` : ""}. Categories are suggested from your history — change any before importing.
              </p>
              <div className="max-h-[320px] overflow-auto rounded-xl border border-stone-200 dark:border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-stone-50 text-[10px] uppercase tracking-wider text-stone-500 dark:bg-ink-850">
                    <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Description</th><th className="px-3 py-2">Category</th><th className="px-3 py-2 text-right">Amount</th></tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-white/5">
                    {validRows.slice(0, 300).map((row) => (
                      <tr key={row.index}>
                        <td className="whitespace-nowrap px-3 py-1.5 text-stone-500">{row.date}</td>
                        <td className="max-w-[260px] truncate px-3 py-1.5 text-stone-800 dark:text-stone-200" title={row.title}>{row.title}</td>
                        <td className="px-3 py-1.5">
                          <select value={(categoryOverrides[row.index] ?? row.suggested) || ""} onChange={(e) => setCategoryOverrides({ ...categoryOverrides, [row.index]: e.target.value })} className="w-full rounded-md border border-stone-200 bg-white px-1.5 py-1 text-xs dark:border-white/10 dark:bg-white/5 dark:text-stone-200">
                            <option value="">Uncategorised</option>
                            {categories.filter((category) => category.kind === row.kind).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                          </select>
                        </td>
                        <td className={`whitespace-nowrap px-3 py-1.5 text-right font-bold ${row.kind === "income" ? "text-emerald-600" : "text-stone-800 dark:text-stone-200"}`}>{row.kind === "income" ? "+" : "−"}{money(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {validRows.length > 300 && <p className="mt-1 text-[11px] text-stone-400">Showing the first 300 rows; all {validRows.length} will be imported.</p>}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
