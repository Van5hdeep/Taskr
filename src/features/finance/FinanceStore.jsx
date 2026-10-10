import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatSupabaseError } from "../../lib/supabase";
import * as api from "./api";
import { accountBalances, advanceDue, toDay } from "./calc";
import { DEFAULT_CATEGORIES } from "./defaults";

const FinanceContext = createContext(null);
const KEYS = Object.keys(api.TABLES);
const EMPTY = Object.fromEntries(KEYS.map((key) => [key, []]));

let seeding = null;

/** First visit: one Cash account and the default categories. Shared across StrictMode double-mounts. */
function ensureSeed(data) {
  if (data.accounts.length && data.categories.length) return Promise.resolve(data);
  if (!seeding) {
    seeding = (async () => {
      const next = { ...data };
      if (!data.accounts.length) next.accounts = [await api.insertRow("accounts", { name: "Cash", kind: "cash", opening_balance: 0 })];
      if (!data.categories.length) {
        next.categories = await api.insertRows("categories", DEFAULT_CATEGORIES.map(({ name, kind, color }, index) => ({ name, kind, color, position: index })));
      }
      return next;
    })().finally(() => { seeding = null; });
  }
  return seeding;
}

export function FinanceProvider({ children }) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const lists = await Promise.all(KEYS.map((key) => api.listAll(key)));
      const loaded = Object.fromEntries(KEYS.map((key, index) => [key, lists[index]]));
      setData(await ensureSeed(loaded));
    } catch (err) {
      setError(formatSupabaseError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fail = (err, fallback) => {
    toast.error(formatSupabaseError(err, fallback));
    throw err;
  };

  const create = useCallback(async (key, row) => {
    try {
      const created = await api.insertRow(key, row);
      setData((current) => ({ ...current, [key]: [created, ...current[key]] }));
      return created;
    } catch (err) { return fail(err, "Couldn't save."); }
  }, []);

  const createMany = useCallback(async (key, rows) => {
    if (!rows.length) return [];
    try {
      const created = [];
      for (let i = 0; i < rows.length; i += 500) created.push(...await api.insertRows(key, rows.slice(i, i + 500)));
      setData((current) => ({ ...current, [key]: [...created, ...current[key]] }));
      return created;
    } catch (err) { return fail(err, "Couldn't save."); }
  }, []);

  const update = useCallback(async (key, id, patch) => {
    try {
      const saved = await api.updateRow(key, id, patch);
      setData((current) => ({ ...current, [key]: current[key].map((row) => (row.id === id ? saved : row)) }));
      return saved;
    } catch (err) { return fail(err, "Couldn't save the change."); }
  }, []);

  const remove = useCallback(async (key, ids) => {
    const list = Array.isArray(ids) ? ids : [ids];
    try {
      await api.deleteRows(key, list);
      setData((current) => ({ ...current, [key]: current[key].filter((row) => !list.includes(row.id)) }));
    } catch (err) { return fail(err, "Couldn't delete."); }
  }, []);

  /** Records the payment for a bill/subscription and moves its due date forward. */
  const markRecurringPaid = useCallback(async (item, { amount = item.amount, occurredOn = toDay(new Date()), accountId = item.account_id } = {}) => {
    if (!accountId) throw new Error("Choose an account for this bill first.");
    const transaction = await create("transactions", {
      kind: item.kind === "transfer" ? "expense" : item.kind,
      amount,
      occurred_on: occurredOn,
      title: item.title,
      account_id: accountId,
      category_id: item.category_id,
      recurring_id: item.id,
    });
    await update("recurring", item.id, { next_due_on: advanceDue(item.next_due_on, item.cadence, item.interval_count) });
    return transaction;
  }, [create, update]);

  const skipRecurring = useCallback(
    (item) => update("recurring", item.id, { next_due_on: advanceDue(item.next_due_on, item.cadence, item.interval_count) }),
    [update]
  );

  const updateHoldingValue = useCallback(async (holding, value) => {
    const today = toDay(new Date());
    const saved = await update("holdings", holding.id, { current_value: value, value_updated_on: today });
    try { await api.upsertHoldingSnapshot(holding.id, value, today); } catch { /* history is best-effort */ }
    return saved;
  }, [update]);

  const balances = useMemo(() => accountBalances(data.accounts, data.transactions), [data.accounts, data.transactions]);

  const value = useMemo(() => ({
    ...data, balances, loading, error, reload: load,
    create, createMany, update, remove, markRecurringPaid, skipRecurring, updateHoldingValue,
  }), [data, balances, loading, error, load, create, createMany, update, remove, markRecurringPaid, skipRecurring, updateHoldingValue]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance must be used inside <FinanceProvider>");
  return context;
}
