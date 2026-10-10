import { supabase } from "../../lib/supabase";
import { normalizeSubTasks } from "./logic";

// ─── Row mapping ───────────────────────────────────────────────────────────

const toDate = (value) => (value ? new Date(value) : null);
const toIso = (value) => (value ? new Date(value).toISOString() : null);

export function taskFromRow(row) {
  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    notes: row.notes ?? "",
    subTasks: normalizeSubTasks(row.sub_tasks),
    isUrgent: row.is_urgent,
    isImportant: row.is_important,
    deadline: toDate(row.deadline),
    remindAt: toDate(row.remind_at),
    recurrence: row.recurrence ?? "",
    color: row.color ?? "yellow",
    tags: row.tags ?? [],
    pos: row.pos_x == null ? null : { x: row.pos_x, y: row.pos_y, w: row.width, h: row.height },
    zIndex: row.z_index ?? 0,
    sortOrder: row.sort_order ?? 0,
    completedAt: toDate(row.completed_at),
    archivedAt: toDate(row.archived_at),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

/** Converts a partial task (camelCase) into a partial row. Only present keys are written. */
export function taskToRow(patch) {
  const row = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(patch, key);
  if (has("boardId")) row.board_id = patch.boardId;
  if (has("title")) row.title = String(patch.title ?? "").trim() || "Untitled";
  if (has("notes")) row.notes = patch.notes || null;
  if (has("subTasks")) row.sub_tasks = (patch.subTasks ?? []).map(({ id, label, done }) => ({ id, label, done: Boolean(done) }));
  if (has("isUrgent")) row.is_urgent = Boolean(patch.isUrgent);
  if (has("isImportant")) row.is_important = Boolean(patch.isImportant);
  if (has("deadline")) row.deadline = toIso(patch.deadline);
  if (has("remindAt")) row.remind_at = toIso(patch.remindAt);
  if (has("recurrence")) row.recurrence = patch.recurrence || null;
  if (has("color")) row.color = patch.color || "yellow";
  if (has("tags")) row.tags = patch.tags ?? [];
  if (has("pos")) {
    row.pos_x = patch.pos?.x ?? null;
    row.pos_y = patch.pos?.y ?? null;
    row.width = patch.pos?.w ?? null;
    row.height = patch.pos?.h ?? null;
  }
  if (has("zIndex")) row.z_index = Math.round(patch.zIndex ?? 0);
  if (has("sortOrder")) row.sort_order = patch.sortOrder ?? 0;
  if (has("completedAt")) row.completed_at = toIso(patch.completedAt);
  if (has("archivedAt")) row.archived_at = toIso(patch.archivedAt);
  return row;
}

// ─── Boards ────────────────────────────────────────────────────────────────

export async function listBoards() {
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .is("archived_at", null)
    .order("pinned", { ascending: false })
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

let ensuring = null;

/**
 * Returns the user's boards, creating "My board" on first use. Concurrent
 * callers (StrictMode double effects, two tabs of the same page) share one
 * request so the default board is only created once.
 */
export function listBoardsEnsuringDefault() {
  if (!ensuring) {
    ensuring = (async () => {
      const boards = await listBoards();
      if (boards.length) return boards;
      return [await createBoard({ name: "My board" })];
    })().finally(() => { ensuring = null; });
  }
  return ensuring;
}

export async function createBoard({ name, defaultView = "matrix" }) {
  const { data, error } = await supabase
    .from("boards")
    .insert({ name: name.trim() || "Untitled board", default_view: defaultView })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBoard(id, patch) {
  const { data, error } = await supabase.from("boards").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function archiveBoard(id) {
  return updateBoard(id, { archived_at: new Date().toISOString() });
}

// ─── Tasks ─────────────────────────────────────────────────────────────────

export async function listTasks(boardId) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("board_id", boardId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(taskFromRow);
}

export async function createTask(boardId, fields) {
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...taskToRow(fields), board_id: boardId })
    .select()
    .single();
  if (error) throw error;
  return taskFromRow(data);
}

export async function updateTask(id, patch) {
  const { data, error } = await supabase.from("tasks").update(taskToRow(patch)).eq("id", id).select().single();
  if (error) throw error;
  return taskFromRow(data);
}

export async function deleteTask(id) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}
