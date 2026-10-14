import { supabase } from "../../lib/supabase";
import { uniqueTitle } from "../../lib/uniqueTitle";
import { emptyContent, uid } from "./model";

const BUCKET = "workspace-assets";
const LIST_COLUMNS = "id, title, page_style, pinned, archived_at, created_at, updated_at";

/** A title no other document uses; a taken one silently gets (1), (2)… */
async function resolveTitle(title, excludeId) {
  const { data } = await supabase.from("documents").select("id, title");
  return uniqueTitle(title, (data ?? []).filter((row) => row.id !== excludeId).map((row) => row.title));
}


export async function listDocuments({ archived = false } = {}) {
  let query = supabase.from("documents").select(LIST_COLUMNS);
  query = archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  const { data, error } = await query.order("pinned", { ascending: false }).order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getDocument(id) {
  const { data, error } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createDocument({ title = "Untitled document", content = emptyContent(), pageStyle = "plain" } = {}) {
  const { data, error } = await supabase.from("documents").insert({ title: await resolveTitle(title), content, page_style: pageStyle }).select().single();
  if (error) throw error;
  return data;
}

/** Metadata changes (title, pin, archive) — no conflict check. */
export async function updateDocumentMeta(id, patch) {
  if (typeof patch.title === "string") patch = { ...patch, title: await resolveTitle(patch.title, id) };
  const { data, error } = await supabase.from("documents").update(patch).eq("id", id).select(LIST_COLUMNS).single();
  if (error) throw error;
  return data;
}

/**
 * Saves content only if nobody else saved since `expectedUpdatedAt`.
 * Returns the new row, or { conflict: true } when the stored version is newer.
 */
export async function saveDocument(id, patch, expectedUpdatedAt, { force = false } = {}) {
  if (typeof patch.title === "string") patch = { ...patch, title: await resolveTitle(patch.title, id) };
  let query = supabase.from("documents").update(patch).eq("id", id);
  if (!force && expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
  const { data, error } = await query.select("id, title, updated_at").maybeSingle();
  if (error) throw error;
  if (!data) return { conflict: true };
  return data;
}

export async function deleteDocument(id) {
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;
  // Best effort: remove the document's uploaded images.
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const folder = `${user.id}/${id}`;
    const { data: files } = await supabase.storage.from(BUCKET).list(folder, { limit: 1000 });
    if (files?.length) await supabase.storage.from(BUCKET).remove(files.map((file) => `${folder}/${file.name}`));
  } catch { /* orphaned files are harmless and private */ }
}

export async function duplicateDocument(id) {
  const source = await getDocument(id);
  return createDocument({ title: `${source.title} (copy)`, content: source.content, pageStyle: source.page_style });
}

// ─── Images ────────────────────────────────────────────────────────────────

const EXTENSIONS = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg" };
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function uploadImage(documentId, file) {
  if (!EXTENSIONS[file.type]) throw new Error("Only PNG, JPG, WebP, GIF or SVG images can be added.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Images must be 10 MB or smaller.");
  const { data: { user } } = await supabase.auth.getUser();
  const path = `${user.id}/${documentId}/${uid()}.${EXTENSIONS[file.type]}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function dataUrlToFile(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], "image", { type: blob.type || "image/png" });
}

const signedCache = new Map(); // path → { url, expires }
const SIGNED_SECONDS = 60 * 60;

export async function signedImageUrl(path) {
  const cached = signedCache.get(path);
  if (cached && cached.expires > Date.now() + 60_000) return cached.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_SECONDS);
  if (error) throw error;
  signedCache.set(path, { url: data.signedUrl, expires: Date.now() + SIGNED_SECONDS * 1000 });
  return data.signedUrl;
}
