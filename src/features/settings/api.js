import { supabase } from "../../lib/supabase";

export const PROFILE_DEFAULTS = { display_name: "", currency: "INR", locale: "en-IN", week_starts_on: 1, theme: "system" };

export async function getProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data ?? { id: userId, ...PROFILE_DEFAULTS };
}

export async function updateProfile(userId, patch) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...patch }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Children before parents, so foreign keys never block a delete.
const USER_TABLES = [
  "item_links",
  "tasks",
  "boards",
  "fin_holding_snapshots",
  "fin_holdings",
  "fin_transactions",
  "fin_budgets",
  "fin_recurring",
  "fin_goals",
  "fin_categories",
  "fin_accounts",
  "documents",
  "flows",
];

const IMAGE_BUCKET = "workspace-assets";

/** Everything the user has saved, as one JSON-ready object. */
export async function exportAllData(userId) {
  const result = { exported_at: new Date().toISOString(), profile: await getProfile(userId) };
  for (const table of USER_TABLES) {
    const { data, error } = await supabase.from(table).select("*").eq("user_id", userId);
    if (error) throw error;
    result[table] = data ?? [];
  }
  return result;
}

/** Counts of saved rows per area, for the reset warning. */
export async function countSavedData(userId) {
  const count = async (table) => {
    const { count: total, error } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId);
    if (error) throw error;
    return total ?? 0;
  };
  const [stickers, transactions, documents, flows] = await Promise.all([count("tasks"), count("fin_transactions"), count("documents"), count("flows")]);
  return { stickers, transactions, documents, flows };
}

/**
 * Deletes everything the user has saved: stickers, finance, documents (and
 * their uploaded images), flows and links; the profile goes back to defaults.
 * The sign-in itself is kept.
 */
export async function resetAllData(userId) {
  const { data: folder } = await supabase.storage.from(IMAGE_BUCKET).list(userId, { limit: 1000 });
  for (const entry of folder ?? []) {
    // Images live at <user>/<document>/<file>.
    const { data: files } = await supabase.storage.from(IMAGE_BUCKET).list(`${userId}/${entry.name}`, { limit: 1000 });
    if (files?.length) await supabase.storage.from(IMAGE_BUCKET).remove(files.map((file) => `${userId}/${entry.name}/${file.name}`));
  }
  for (const table of USER_TABLES) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) throw error;
  }
  const { display_name: _keepName, ...defaults } = PROFILE_DEFAULTS;
  await updateProfile(userId, defaults);
}

/** Removes taskr's keys from this browser's local storage. */
export function clearLocalData() {
  try {
    Object.keys(localStorage).filter((key) => key.startsWith("taskr")).forEach((key) => localStorage.removeItem(key));
  } catch { /* storage unavailable */ }
}
