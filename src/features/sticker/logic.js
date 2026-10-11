import * as chrono from "chrono-node";
import { addDays, addMonths, addWeeks, addYears, isWeekend } from "date-fns";

// ─── Matrix ────────────────────────────────────────────────────────────────

export const QUADRANTS = [
  { id: "do", label: "Do first", hint: "Urgent and important", isUrgent: true, isImportant: true },
  { id: "schedule", label: "Schedule", hint: "Important, not urgent", isUrgent: false, isImportant: true },
  { id: "delegate", label: "Delegate", hint: "Urgent, not important", isUrgent: true, isImportant: false },
  { id: "later", label: "Later", hint: "Neither — park or drop", isUrgent: false, isImportant: false },
];

/** Soft limit from the "cap each quadrant" practice. */
export const QUADRANT_SOFT_CAP = 7;

export function quadrantOf(task) {
  const urgent = Boolean(task.isUrgent ?? task.is_urgent);
  const important = Boolean(task.isImportant ?? task.is_important);
  if (urgent && important) return "do";
  if (important) return "schedule";
  if (urgent) return "delegate";
  return "later";
}

export function flagsForQuadrant(quadrantId) {
  const quadrant = QUADRANTS.find((item) => item.id === quadrantId) ?? QUADRANTS[3];
  return { isUrgent: quadrant.isUrgent, isImportant: quadrant.isImportant };
}

// ─── Capture parsing ───────────────────────────────────────────────────────

const DEFAULT_HOUR = 9;

/**
 * Parse a one-line capture. Deterministic, no AI:
 *   "Pay rent tomorrow 9am ! #home" →
 *   { title: "Pay rent", isUrgent: true, isImportant: false, tags: ["home"], deadline: <tomorrow 09:00> }
 * Markers: "!" urgent, "*" important, "#tag" tags, plus a natural-language date.
 */
export function parseCapture(input, now = new Date()) {
  let text = ` ${String(input || "")} `;
  const tags = [];

  text = text.replace(/(^|\s)#([\p{L}\p{N}_-]+)/gu, (_, lead, tag) => {
    const normalized = tag.toLowerCase();
    if (!tags.includes(normalized)) tags.push(normalized);
    return lead;
  });

  let isUrgent = false;
  let isImportant = false;
  text = text.replace(/(^|\s)(!!?|\*\*?)(?=\s)/g, (_, lead, marker) => {
    if (marker.startsWith("!")) isUrgent = true;
    else isImportant = true;
    return lead;
  });

  let deadline = null;
  let dateText = null;
  const [result] = chrono.parse(text, now, { forwardDate: true });
  if (result) {
    const date = result.start.date();
    if (!result.start.isCertain("hour")) date.setHours(DEFAULT_HOUR, 0, 0, 0);
    deadline = date;
    dateText = result.text;
    text = text.slice(0, result.index) + text.slice(result.index + result.text.length);
    // Drop a dangling connector left behind ("Call mom on", "Submit by").
    text = text.replace(/\s+(on|by|at|due|before)\s*$/i, " ");
  }

  const title = text.replace(/\s+/g, " ").trim();
  return { title, isUrgent, isImportant, tags, deadline, dateText };
}

// ─── Recurrence ────────────────────────────────────────────────────────────

export const RECURRENCE_OPTIONS = [
  { id: "", label: "Does not repeat" },
  { id: "daily", label: "Every day" },
  { id: "weekdays", label: "Every weekday" },
  { id: "weekly", label: "Every week" },
  { id: "monthly", label: "Every month" },
  { id: "yearly", label: "Every year" },
];

/** Next occurrence strictly after `from`, or null for a non-repeating rule. */
export function nextOccurrence(from, rule) {
  if (!from || !rule) return null;
  const date = new Date(from);
  switch (rule) {
    case "daily": return addDays(date, 1);
    case "weekdays": {
      let next = addDays(date, 1);
      while (isWeekend(next)) next = addDays(next, 1);
      return next;
    }
    case "weekly": return addWeeks(date, 1);
    case "monthly": return addMonths(date, 1);
    case "yearly": return addYears(date, 1);
    default: return null;
  }
}

// ─── Subtasks ──────────────────────────────────────────────────────────────

let localIdCounter = 0;
export function newSubTaskId() {
  localIdCounter += 1;
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `st-${Date.now()}-${localIdCounter}`;
}

/** Accepts every historic shape ({text,completed}, {label,completed}, strings) → { id, label, done }. */
export function normalizeSubTasks(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      if (typeof item === "string") return { id: `legacy-${index}`, label: item, done: false };
      if (!item || typeof item !== "object") return null;
      return {
        id: String(item.id ?? `legacy-${index}`),
        label: String(item.label ?? item.text ?? ""),
        done: Boolean(item.done ?? item.completed),
      };
    })
    .filter((item) => item && item.label.trim());
}

// ─── Filtering & sorting ───────────────────────────────────────────────────

export const DEFAULT_FILTERS = { q: "", tag: "", due: "all", status: "open" };

function startOfDay(ms) {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function matchesFilters(task, filters, now = Date.now()) {
  const { q = "", tag = "", due = "all", status = "open" } = filters;

  if (status === "archived") { if (!task.archivedAt) return false; }
  else if (task.archivedAt) return false;
  else if (status === "done" && !task.completedAt) return false;
  else if (status === "open" && task.completedAt) return false;

  if (tag && !(task.tags ?? []).includes(tag)) return false;

  if (q) {
    const needle = q.toLowerCase();
    const haystack = [task.title, task.notes, ...(task.tags ?? []), ...(task.subTasks ?? []).map((st) => st.label)].join(" ").toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  if (due !== "all") {
    const deadline = task.deadline ? new Date(task.deadline).getTime() : null;
    const todayStart = startOfDay(now);
    const dayMs = 24 * 60 * 60 * 1000;
    if (due === "none") return deadline == null;
    if (deadline == null) return false;
    if (due === "overdue") return deadline < now && !task.completedAt;
    if (due === "today") return deadline >= todayStart && deadline < todayStart + dayMs;
    if (due === "week") return deadline >= todayStart && deadline < todayStart + 7 * dayMs;
  }
  return true;
}

/** Overdue first, then nearest deadline, then manual order, then newest. */
export function compareTasks(a, b, now = Date.now()) {
  const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
  const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
  const oa = da < now ? 0 : 1;
  const ob = db < now ? 0 : 1;
  if (oa !== ob) return oa - ob;
  if (da !== db) return da - db;
  if ((a.sortOrder ?? 0) !== (b.sortOrder ?? 0)) return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  return new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0);
}

export function collectTags(tasks) {
  return [...new Set(tasks.flatMap((task) => task.tags ?? []))].sort();
}

/** Queue for the daily review: overdue, due today, then remaining "Do first". */
export function reviewQueue(tasks, now = Date.now()) {
  const todayEnd = startOfDay(now) + 24 * 60 * 60 * 1000;
  return tasks
    .filter((task) => !task.completedAt && !task.archivedAt)
    .filter((task) => {
      const deadline = task.deadline ? new Date(task.deadline).getTime() : null;
      return (deadline != null && deadline < todayEnd) || quadrantOf(task) === "do";
    })
    .sort((a, b) => compareTasks(a, b, now));
}

// ─── Deadlines ─────────────────────────────────────────────────────────────

export function deadlineState(deadline, now = Date.now()) {
  if (!deadline) return "none";
  const ms = new Date(deadline).getTime() - now;
  if (ms < 0) return "overdue";
  if (ms <= 24 * 60 * 60 * 1000) return "soon";
  return "later";
}

export function formatCountdown(milliseconds) {
  if (milliseconds <= 0) return "00:00:00";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
