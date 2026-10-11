import { quadrantOf } from "./logic";

/**
 * A sticker's colour is its urgency. The urgent/important flags are kept in
 * step so Home and search (which read the flags) agree with the board.
 */
export const URGENCY = [
  {
    id: "red",
    label: "Urgent",
    hint: "Do it now",
    flags: { isUrgent: true, isImportant: true },
    dot: "bg-red-500",
    card: "bg-red-50 border-red-200 text-red-950 dark:bg-red-500/[0.12] dark:border-red-400/25 dark:text-red-50",
    tape: "bg-red-500",
    chip: "bg-red-500/10 text-red-700 ring-red-500/30 dark:text-red-300",
  },
  {
    id: "blue",
    label: "Soon",
    hint: "A little urgent",
    flags: { isUrgent: false, isImportant: true },
    dot: "bg-blue-500",
    card: "bg-blue-50 border-blue-200 text-blue-950 dark:bg-blue-500/[0.12] dark:border-blue-400/25 dark:text-blue-50",
    tape: "bg-blue-500",
    chip: "bg-blue-500/10 text-blue-700 ring-blue-500/30 dark:text-blue-300",
  },
  {
    id: "green",
    label: "Can wait",
    hint: "No rush",
    flags: { isUrgent: false, isImportant: false },
    dot: "bg-emerald-500",
    card: "bg-emerald-50 border-emerald-200 text-emerald-950 dark:bg-emerald-500/[0.12] dark:border-emerald-400/25 dark:text-emerald-50",
    tape: "bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300",
  },
];

export const urgencyMeta = (id) => URGENCY.find((item) => item.id === id) ?? URGENCY[2];

/** Urgency of any task, including ones made before stickers were colour-coded. */
export function urgencyOf(task) {
  if (URGENCY.some((item) => item.id === task.color)) return task.color;
  const quadrant = quadrantOf(task);
  return quadrant === "do" ? "red" : quadrant === "later" ? "green" : "blue";
}

/** Task fields for a sticker of this urgency. */
export const urgencyFields = (id) => ({ color: urgencyMeta(id).id, ...urgencyMeta(id).flags });

/** How long a checked-off sticker stays on the Done board. */
export const DONE_TTL_MS = 24 * 60 * 60 * 1000;
