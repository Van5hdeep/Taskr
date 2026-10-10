export const STICKER_COLORS = [
  { id: "yellow", label: "Yellow", hex: "#eab308", card: "bg-yellow-100 text-yellow-950 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-100 dark:border-yellow-700/50", stripe: "bg-yellow-400" },
  { id: "red", label: "Red", hex: "#ef4444", card: "bg-red-100 text-red-950 border-red-300 dark:bg-red-900/40 dark:text-red-100 dark:border-red-700/50", stripe: "bg-red-500" },
  { id: "orange", label: "Orange", hex: "#f97316", card: "bg-orange-100 text-orange-950 border-orange-300 dark:bg-orange-900/40 dark:text-orange-100 dark:border-orange-700/50", stripe: "bg-orange-500" },
  { id: "green", label: "Green", hex: "#16a34a", card: "bg-green-100 text-green-950 border-green-300 dark:bg-green-900/40 dark:text-green-100 dark:border-green-700/50", stripe: "bg-green-500" },
  { id: "blue", label: "Blue", hex: "#2563eb", card: "bg-blue-100 text-blue-950 border-blue-300 dark:bg-blue-900/40 dark:text-blue-100 dark:border-blue-700/50", stripe: "bg-blue-500" },
  { id: "purple", label: "Purple", hex: "#8b5cf6", card: "bg-purple-100 text-purple-950 border-purple-300 dark:bg-purple-900/40 dark:text-purple-100 dark:border-purple-700/50", stripe: "bg-purple-500" },
  { id: "pink", label: "Pink", hex: "#ec4899", card: "bg-pink-100 text-pink-950 border-pink-300 dark:bg-pink-900/40 dark:text-pink-100 dark:border-pink-700/50", stripe: "bg-pink-500" },
  { id: "grey", label: "Grey", hex: "#64748b", card: "bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800/60 dark:text-slate-100 dark:border-slate-600/50", stripe: "bg-slate-500" },
  { id: "white", label: "White", hex: "#f8fafc", card: "bg-white text-zinc-900 border-zinc-200 dark:bg-[#161f42] dark:text-slate-100 dark:border-blue-500/20", stripe: "bg-zinc-300" },
];

export function colorMeta(colorId) {
  return STICKER_COLORS.find((color) => color.id === colorId) ?? STICKER_COLORS[0];
}

export const VIEWS = [
  { id: "matrix", label: "Matrix" },
  { id: "free", label: "Board" },
  { id: "list", label: "List" },
];

export const DUE_FILTERS = [
  { id: "all", label: "Any date" },
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Today" },
  { id: "week", label: "Next 7 days" },
  { id: "none", label: "No date" },
];

export const STATUS_FILTERS = [
  { id: "open", label: "Open" },
  { id: "done", label: "Done" },
  { id: "archived", label: "Archived" },
];
