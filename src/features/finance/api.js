import { supabase } from "../../lib/supabase";

export const TABLES = {
  accounts: "fin_accounts",
  categories: "fin_categories",
  transactions: "fin_transactions",
  budgets: "fin_budgets",
  recurring: "fin_recurring",
  goals: "fin_goals",
  holdings: "fin_holdings",
};

const ORDER = {
  accounts: [["position", true], ["created_at", true]],
  categories: [["kind", true], ["position", true], ["name", true]],
  transactions: [["occurred_on", false], ["created_at", false]],
  budgets: [["created_at", true]],
  recurring: [["next_due_on", true]],
  goals: [["created_at", true]],
  holdings: [["created_at", true]],
};

function buildQuery(key) {
  let query = supabase.from(TABLES[key]).select("*");
  for (const [column, ascending] of ORDER[key]) query = query.order(column, { ascending });
  return query;
}

export async function listAll(key) {
  // Transactions can grow large; page through them in chunks of 1000.
  if (key !== "transactions") {
    const { data, error } = await buildQuery(key);
    if (error) throw error;
    return data ?? [];
  }
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await buildQuery(key).range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

export async function insertRows(key, rows) {
  const { data, error } = await supabase.from(TABLES[key]).insert(rows).select();
  if (error) throw error;
  return data ?? [];
}

export async function insertRow(key, row) {
  const [created] = await insertRows(key, [row]);
  return created;
}

export async function updateRow(key, id, patch) {
  const { data, error } = await supabase.from(TABLES[key]).update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRows(key, ids) {
  const { error } = await supabase.from(TABLES[key]).delete().in("id", ids);
  if (error) throw error;
}

export async function existingImportHashes(hashes) {
  const found = new Set();
  for (let i = 0; i < hashes.length; i += 200) {
    const chunk = hashes.slice(i, i + 200);
    const { data, error } = await supabase.from(TABLES.transactions).select("import_hash").in("import_hash", chunk);
    if (error) throw error;
    for (const row of data ?? []) found.add(row.import_hash);
  }
  return found;
}

export async function upsertHoldingSnapshot(holdingId, value, asOf) {
  const { error } = await supabase
    .from("fin_holding_snapshots")
    .upsert({ holding_id: holdingId, value, as_of: asOf }, { onConflict: "holding_id,as_of" });
  if (error) throw error;
}
