import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { createPortal } from "react-dom";
import { Calendar, CornerDownLeft, Flame, Loader2, Star, X } from "../../lib/icons";
import { toast } from "sonner";
import { supabase, formatSupabaseError } from "../../lib/supabase";
import { useMoneyFormat } from "../../lib/profile";
import * as stickerApi from "../sticker/api";
import { parseCapture } from "../sticker/logic";
import { urgencyFields } from "../sticker/constants";
import { formatDue } from "../sticker/format";
import { parseDay, suggestCategory } from "../finance/calc";
import { detectMode, parseMoneyCapture } from "./parse";

const MODES = [
  { id: "task", label: "Sticker", hint: "Call bank tomorrow 5pm !   (! makes it red/urgent)" },
  { id: "expense", label: "Expense", hint: "₹450 lunch yesterday" },
  { id: "income", label: "Income", hint: "50000 salary" },
];

async function financeContext() {
  const [accounts, categories, history] = await Promise.all([
    supabase.from("fin_accounts").select("id, name, is_archived").order("position").order("created_at"),
    supabase.from("fin_categories").select("id, name, kind, is_archived").order("position"),
    supabase.from("fin_transactions").select("title, kind, category_id, occurred_on").order("occurred_on", { ascending: false }).limit(300),
  ]);
  for (const result of [accounts, categories, history]) if (result.error) throw result.error;
  return { accounts: accounts.data.filter((a) => !a.is_archived), categories: categories.data.filter((c) => !c.is_archived), history: history.data };
}

/** One input for a task, an expense or an income. Alt+N from anywhere. */
export default function QuickCapture({ initialMode = "task", onClose }) {
  const navigate = useNavigate();
  const money = useMoneyFormat();
  const [mode, setMode] = useState(initialMode);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [boards, setBoards] = useState([]);
  const [boardId, setBoardId] = useState("");
  const [finance, setFinance] = useState(null);
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState(null); // null = use suggestion
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  useEffect(() => {
    if (mode === "task" && !boards.length) {
      stickerApi.listBoardsEnsuringDefault().then((rows) => { setBoards(rows); setBoardId((current) => current || rows[0]?.id || ""); }).catch(() => {});
    }
    if (mode !== "task" && !finance) {
      financeContext().then((ctx) => { setFinance(ctx); setAccountId((current) => current || ctx.accounts[0]?.id || ""); }).catch(() => setFinance({ accounts: [], categories: [], history: [] }));
    }
  }, [mode, boards.length, finance]);

  // A typed prefix ("e ", "i ", "t ") switches mode.
  const onChange = (value) => {
    const detected = detectMode(value);
    if (detected) { setMode(detected.mode); setText(detected.rest); setCategoryId(null); return; }
    setText(value);
  };

  const task = useMemo(() => (mode === "task" ? parseCapture(text, new Date()) : null), [mode, text]);
  const entry = useMemo(() => (mode !== "task" ? parseMoneyCapture(text, new Date()) : null), [mode, text]);
  const suggested = useMemo(() => {
    if (!entry?.title || !finance) return null;
    return suggestCategory(entry.title, finance.history.filter((tx) => tx.kind === mode));
  }, [entry, finance, mode]);
  const effectiveCategory = categoryId ?? suggested ?? "";
  const ready = mode === "task" ? Boolean(task?.title && boardId) : Boolean(entry?.amount && entry.title);

  const submit = async (event) => {
    event?.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    try {
      if (mode === "task") {
        const created = await stickerApi.createTask(boardId, { title: task.title, deadline: task.deadline, tags: task.tags, ...urgencyFields(task.isUrgent ? "red" : "blue") });
        toast.success(`Sticker added: "${created.title}"`, { action: { label: "Open", onClick: () => navigate(`/sticker?board=${boardId}&task=${created.id}`) } });
      } else {
        let account = accountId;
        if (!account) {
          const { data, error } = await supabase.from("fin_accounts").insert({ name: "Cash", kind: "cash", opening_balance: 0 }).select().single();
          if (error) throw error;
          account = data.id;
        }
        const { error } = await supabase.from("fin_transactions").insert({ kind: mode, amount: entry.amount, title: entry.title.slice(0, 200), occurred_on: entry.date, account_id: account, category_id: effectiveCategory || null });
        if (error) throw error;
        toast.success(`${mode === "income" ? "Income" : "Expense"} added: ${money(entry.amount)} · ${entry.title}`, { action: { label: "View", onClick: () => navigate("/finance/transactions") } });
      }
      onClose();
    } catch (err) {
      toast.error(formatSupabaseError(err));
      setBusy(false);
    }
  };

  const chip = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold";
  const categories = finance?.categories.filter((category) => category.kind === mode) ?? [];

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-stone-900/40 p-4 pt-[14vh] backdrop-blur-sm" onMouseDown={onClose}>
      <form onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Quick add" className="w-full max-w-xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-white/10 dark:bg-ink-900">
        <div className="flex items-center gap-1 border-b border-stone-100 px-3 pt-3 dark:border-white/10">
          {MODES.map((item) => (
            <button key={item.id} type="button" onClick={() => { setMode(item.id); setCategoryId(null); inputRef.current?.focus(); }} className={`rounded-t-lg border-b-2 px-3 py-2 text-xs font-bold ${mode === item.id ? "border-amber-600 text-amber-800 dark:text-amber-300" : "border-transparent text-stone-500 hover:text-stone-800"}`}>
              {item.label}
            </button>
          ))}
          <button type="button" onClick={onClose} className="ml-auto rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center gap-2 px-4 py-3">
          <input
            ref={inputRef}
            value={text}
            onChange={(event) => onChange(event.target.value)}
            placeholder={MODES.find((item) => item.id === mode).hint}
            aria-label={`Quick add ${mode}`}
            className="min-w-0 flex-1 bg-transparent text-base text-stone-900 outline-none placeholder:text-stone-400 dark:text-white"
          />
          <button type="submit" disabled={!ready || busy} className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 dark:bg-amber-400 dark:text-stone-900 px-3 py-2 text-xs font-bold text-white hover:bg-stone-800 dark:hover:bg-amber-300 disabled:opacity-40">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CornerDownLeft className="h-3.5 w-3.5" />} Add
          </button>
        </div>
        <div className="flex min-h-11 flex-wrap items-center gap-2 border-t border-stone-100 bg-stone-50/70 px-4 py-2 text-xs dark:border-white/10 dark:bg-white/[0.03]">
          {mode === "task" ? (
            <>
              {task?.isUrgent && <span className={`${chip} bg-red-100 text-red-700`}><Flame className="h-3 w-3" /> Urgent (red sticker)</span>}
              {task?.isImportant && !task?.isUrgent && <span className={`${chip} bg-amber-100 text-amber-800`}><Star className="h-3 w-3" /> Soon</span>}
              {task?.deadline && <span className={`${chip} bg-amber-50 text-amber-800`}><Calendar className="h-3 w-3" /> {formatDue(task.deadline)}</span>}
              {task?.tags.map((tag) => <span key={tag} className={`${chip} bg-stone-200/70 text-stone-600`}>#{tag}</span>)}
            </>
          ) : (
            <>
              {entry?.amount ? <span className={`${chip} ${mode === "income" ? "bg-emerald-100 text-emerald-700" : "bg-stone-200/70 text-stone-700"}`}>{mode === "income" ? "+" : "−"}{money(entry.amount)}</span> : <span className="text-stone-400">Type an amount and what it was for</span>}
              {entry?.amount && <span className={`${chip} bg-amber-50 text-amber-800`}><Calendar className="h-3 w-3" /> {parseDay(entry.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</span>}
              <span className="ml-auto flex items-center gap-1.5">
                <select value={effectiveCategory} onChange={(event) => setCategoryId(event.target.value)} aria-label="Category" className="rounded-md border border-stone-200 bg-white px-1.5 py-1 text-xs dark:border-white/10 dark:bg-white/5 dark:text-stone-200">
                  <option value="">Uncategorised</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.id === suggested && categoryId == null ? " (suggested)" : ""}</option>)}
                </select>
                <select value={accountId} onChange={(event) => setAccountId(event.target.value)} aria-label="Account" className="rounded-md border border-stone-200 bg-white px-1.5 py-1 text-xs dark:border-white/10 dark:bg-white/5 dark:text-stone-200">
                  {finance?.accounts.length ? finance.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>) : <option value="">Cash (new)</option>}
                </select>
              </span>
            </>
          )}
        </div>
        <p className="border-t border-stone-100 px-4 py-2 text-[11px] text-stone-400 dark:border-white/10">Start with <kbd className="font-mono">t</kbd>, <kbd className="font-mono">e</kbd> or <kbd className="font-mono">i</kbd> + space to switch · Enter to add · Esc to close</p>
      </form>
    </div>,
    document.body
  );
}
