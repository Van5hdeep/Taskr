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
