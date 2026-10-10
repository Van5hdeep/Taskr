import { supabase } from "../../lib/supabase";
import { emptyScene } from "./model";

const LIST_COLUMNS = "id, title, diagram_type, pinned, archived_at, created_at, updated_at";

export async function listFlows({ archived = false } = {}) {
  let query = supabase.from("flows").select(LIST_COLUMNS);
  query = archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  const { data, error } = await query.order("pinned", { ascending: false }).order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getFlow(id) {
  const { data, error } = await supabase.from("flows").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createFlow({ title = "Untitled flow", scene = emptyScene(), diagramType = scene.diagramType ?? "blank" } = {}) {
  const { data, error } = await supabase.from("flows").insert({ title, scene, diagram_type: diagramType }).select().single();
  if (error) throw error;
  return data;
}

export async function updateFlowMeta(id, patch) {
  const { data, error } = await supabase.from("flows").update(patch).eq("id", id).select(LIST_COLUMNS).single();
  if (error) throw error;
  return data;
}

/** Saves only if nobody saved since `expectedUpdatedAt`; otherwise returns { conflict: true }. */
export async function saveFlow(id, patch, expectedUpdatedAt, { force = false } = {}) {
  let query = supabase.from("flows").update(patch).eq("id", id);
  if (!force && expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
  const { data, error } = await query.select("id, updated_at").maybeSingle();
  if (error) throw error;
  return data ?? { conflict: true };
}

export async function deleteFlow(id) {
  const { error } = await supabase.from("flows").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateFlow(id) {
  const source = await getFlow(id);
  return createFlow({ title: `${source.title} (copy)`, scene: source.scene, diagramType: source.diagram_type });
}
