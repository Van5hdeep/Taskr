import { supabase } from "../supabase/client";

const PRIORITY_TO_SCORE = {
  urgent: 9,
  important: 6,
  "not-important": 3,
};

function normalizePriority(priority) {
  const raw = String(priority || "").toLowerCase().trim();
  if (raw.includes("urgent") || raw.includes("red")) return "urgent";
  if (raw.includes("not important") || raw.includes("not-important") || raw.includes("green") || raw.includes("low")) {
    return "not-important";
  }
  return "important";
}

function normalizeDeadline(input) {
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  if (raw === "tomorrow") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  }
  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

async function findTaskByTitle(userId, title) {
  const needle = String(title || "").trim().toLowerCase();
  if (!needle) return null;

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .ilike("title", `%${needle}%`)
    .limit(10);
  if (error) throw error;
  if (!data?.length) return null;

  const exact = data.find((row) => String(row.title || "").toLowerCase() === needle);
  return exact ?? data[0];
}

export async function createTask(userId, { title, priority = "important", deadline, rawInput = "" }) {
  const level = normalizePriority(priority);
  const payload = {
    user_id: userId,
    title: String(title || "Untitled Task").trim(),
    raw_input: rawInput,
    deadline: normalizeDeadline(deadline),
    urgency_score: PRIORITY_TO_SCORE[level],
    sub_tasks: [{ text: "Task over", completed: false }],
    is_completed: false,
  };
  const { data, error } = await supabase.from("tasks").insert([payload]).select().single();
  if (error) throw error;
  return data;
}

export async function createTasks(userId, { tasks }) {
  const rows = (Array.isArray(tasks) ? tasks : []).map((task, idx) => {
    const level = normalizePriority(task.priority);
    return {
      user_id: userId,
      title: String(task.title || `Placeholder Task ${idx + 1}`).trim(),
      raw_input: task.rawInput || "",
      deadline: normalizeDeadline(task.deadline || "tomorrow"),
      urgency_score: PRIORITY_TO_SCORE[level],
      sub_tasks: [{ text: "Task over", completed: false }],
      is_completed: false,
    };
  });
  if (!rows.length) return [];
  const { data, error } = await supabase.from("tasks").insert(rows).select();
  if (error) throw error;
  return data ?? [];
}

export async function updateTask(userId, { taskId, fields }) {
  const updates = {};
  if (fields.title) updates.title = fields.title;
  if (fields.deadline) updates.deadline = normalizeDeadline(fields.deadline);
  if (fields.priority) updates.urgency_score = PRIORITY_TO_SCORE[normalizePriority(fields.priority)];
  if (fields.rawInput !== undefined) updates.raw_input = fields.rawInput;
  const { data, error } = await supabase.from("tasks").update(updates).eq("id", taskId).eq("user_id", userId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTask(userId, { taskId }) {
  const { data, error } = await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", userId).select().single();
  if (error) throw error;
  return data;
}

export async function completeTask(userId, { taskId }) {
  const { data, error } = await supabase.from("tasks").update({ is_completed: true }).eq("id", taskId).eq("user_id", userId).select().single();
  if (error) throw error;
  return data;
}

export async function uncompleteTask(userId, { taskId }) {
  const { data, error } = await supabase.from("tasks").update({ is_completed: false }).eq("id", taskId).eq("user_id", userId).select().single();
  if (error) throw error;
  return data;
}

export async function setPriority(userId, { taskId, priority }) {
  const { data, error } = await supabase
    .from("tasks")
    .update({ urgency_score: PRIORITY_TO_SCORE[normalizePriority(priority)] })
    .eq("id", taskId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setDueDate(userId, { taskId, dueDate }) {
  const { data, error } = await supabase
    .from("tasks")
    .update({ deadline: normalizeDeadline(dueDate) })
    .eq("id", taskId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTasks(userId, { includeArchived = false } = {}) {
  let query = supabase.from("tasks").select("*").eq("user_id", userId).order("deadline", { ascending: true });
  // Removed is_archived filter because column doesn't exist in the current schema
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function searchTasks(userId, { query, priority }) {
  let q = supabase.from("tasks").select("*").eq("user_id", userId);
  if (query) q = q.ilike("title", `%${query}%`);
  if (priority) q = q.eq("urgency_score", PRIORITY_TO_SCORE[normalizePriority(priority)]);
  const { data, error } = await q.order("deadline", { ascending: true }).limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function archiveTask(userId, { taskId }) {
  throw new Error("Archiving is not supported by the current database schema. Use deleteTask instead.");
}

export async function restoreTask(userId, { taskId }) {
  throw new Error("Archiving is not supported by the current database schema.");
}

export async function resolveTaskIdByTitle(userId, taskTitle) {
  const task = await findTaskByTitle(userId, taskTitle);
  return task?.id ?? null;
}

