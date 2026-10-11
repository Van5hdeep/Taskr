import { supabase } from "../../lib/supabase";

// item_links connects any two items (task, document, flow). Links are shown
// from both ends, so direction only records which side created them.

export const LINK_TYPES = { task: "Task", document: "Document", flow: "Diagram" };

export function linkHref(type, id, extra = {}) {
  if (type === "document") return `/workspace/${id}`;
  if (type === "flow") return `/flow/${id}`;
  if (type === "task") return `/sticker?${new URLSearchParams({ ...(extra.boardId ? { board: extra.boardId } : {}), task: id })}`;
  return "/home";
}

async function titlesFor(type, ids) {
  if (!ids.length) return {};
  const table = type === "task" ? "tasks" : type === "document" ? "documents" : "flows";
  const columns = type === "task" ? "id, title, board_id, completed_at" : "id, title";
  const { data, error } = await supabase.from(table).select(columns).in("id", ids);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [row.id, row]));
}

/** Links touching an item, resolved to { linkId, type, id, title, href, done }. Missing targets are dropped. */
export async function listLinks(type, id) {
  const { data, error } = await supabase
    .from("item_links")
    .select("*")
    .or(`and(from_type.eq.${type},from_id.eq.${id}),and(to_type.eq.${type},to_id.eq.${id})`);
  if (error) throw error;
  const others = (data ?? []).map((link) => (link.from_type === type && link.from_id === id
    ? { linkId: link.id, type: link.to_type, id: link.to_id }
    : { linkId: link.id, type: link.from_type, id: link.from_id }));
  const byType = {};
  for (const other of others) (byType[other.type] ??= []).push(other.id);
  const resolved = Object.fromEntries(await Promise.all(Object.entries(byType).map(async ([kind, ids]) => [kind, await titlesFor(kind, ids)])));
  return others
    .map((other) => {
      const row = resolved[other.type]?.[other.id];
      if (!row) return null;
      return { ...other, title: row.title, done: Boolean(row.completed_at), href: linkHref(other.type, other.id, { boardId: row.board_id }) };
    })
    .filter(Boolean);
}

export async function addLink(from, to) {
  const { data, error } = await supabase
    .from("item_links")
    .upsert({ from_type: from.type, from_id: from.id, to_type: to.type, to_id: to.id }, { onConflict: "user_id,from_type,from_id,to_type,to_id", ignoreDuplicates: true })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function removeLink(linkId) {
  const { error } = await supabase.from("item_links").delete().eq("id", linkId);
  if (error) throw error;
}

/** Title search across linkable items (used by the link picker and the command palette). */
export async function searchItems(query, { types = ["task", "document", "flow"], limit = 6 } = {}) {
  const needle = query.trim();
  const like = `%${needle.replace(/[%_]/g, "")}%`;
  const searches = types.map(async (type) => {
    let request;
    if (type === "task") request = supabase.from("tasks").select("id, title, board_id, completed_at").is("archived_at", null);
    if (type === "document") request = supabase.from("documents").select("id, title, updated_at").is("archived_at", null);
    if (type === "flow") request = supabase.from("flows").select("id, title, updated_at").is("archived_at", null);
    if (type === "transaction") request = supabase.from("fin_transactions").select("id, title, amount, kind, occurred_on");
    if (needle) request = request.ilike("title", like);
    request = type === "transaction" ? request.order("occurred_on", { ascending: false }) : type === "task" ? request.order("created_at", { ascending: false }) : request.order("updated_at", { ascending: false });
    const { data, error } = await request.limit(limit);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      type,
      id: row.id,
      title: row.title,
      done: Boolean(row.completed_at),
      meta: row,
      href: type === "transaction" ? `/finance/transactions?${new URLSearchParams({ q: row.title })}` : linkHref(type, row.id, { boardId: row.board_id }),
    }));
  });
  const results = await Promise.allSettled(searches);
  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}
