import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, CalendarDays, Check, ChevronRight, MoveDown, PartyPopper, X } from "lucide-react";
import { addDays, addWeeks, setHours, setMinutes, startOfDay } from "date-fns";
import { QUADRANTS, quadrantOf, reviewQueue } from "../logic";
import { formatDue } from "../format";

const ACTIONS = [
  { id: "done", key: "d", label: "Done", icon: Check, tone: "bg-emerald-600 text-white hover:bg-emerald-700" },
  { id: "tomorrow", key: "t", label: "Tomorrow", icon: CalendarClock, tone: "bg-blue-600 text-white hover:bg-blue-700" },
  { id: "week", key: "w", label: "Next week", icon: CalendarDays, tone: "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-300" },
  { id: "later", key: "l", label: "Move to Later", icon: MoveDown, tone: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200" },
  { id: "keep", key: "k", label: "Keep as is", icon: ChevronRight, tone: "text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5" },
];

function morningOf(date) {
  return setMinutes(setHours(startOfDay(date), 9), 0);
}

/**
 * Guided daily review: one card at a time over overdue, due-today and
 * "Do first" tasks. Keys: D done · T tomorrow · W next week · L later · K keep.
 */
export default function ReviewDialog({ tasks, now, onClose, onComplete, onUpdate }) {
  // Snapshot the queue once so items don't jump while the user decides.
  const queue = useMemo(() => reviewQueue(tasks, now), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [index, setIndex] = useState(0);
  const [tally, setTally] = useState({ done: 0, moved: 0, kept: 0 });
  const busy = useRef(false);
  const task = queue[index];

  const act = async (actionId) => {
    if (!task || busy.current) return;
    busy.current = true;
    try {
      if (actionId === "done") await onComplete(task.id);
      if (actionId === "tomorrow") await onUpdate(task.id, { deadline: morningOf(addDays(new Date(now), 1)) });
      if (actionId === "week") await onUpdate(task.id, { deadline: morningOf(addWeeks(new Date(now), 1)) });
      if (actionId === "later") await onUpdate(task.id, { isUrgent: false, isImportant: false });
      setTally((current) => ({
        done: current.done + (actionId === "done" ? 1 : 0),
        moved: current.moved + (["tomorrow", "week", "later"].includes(actionId) ? 1 : 0),
        kept: current.kept + (actionId === "keep" ? 1 : 0),
      }));
      setIndex((current) => current + 1);
    } finally {
      busy.current = false;
    }
  };

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.target.closest?.("input, textarea, select")) return;
      const action = ACTIONS.find((item) => item.key === event.key.toLowerCase());
      if (action) { event.preventDefault(); act(action.id); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const quadrant = task ? QUADRANTS.find((q) => q.id === quadrantOf(task)) : null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Daily review" onClick={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0e1532]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Daily review</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{task ? `${index + 1} of ${queue.length}` : "All caught up"}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5" aria-label="Close review"><X className="h-4 w-4" /></button>
        </div>
        {queue.length > 0 && (
          <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${(Math.min(index, queue.length) / queue.length) * 100}%` }} />
          </div>
        )}

        {task ? (
          <>
            <div className="mb-6 rounded-2xl border border-slate-200 p-5 dark:border-white/10">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{quadrant?.label}</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{task.title}</h3>
              {task.deadline && (
                <p className={`mt-2 text-sm font-semibold ${new Date(task.deadline).getTime() < now ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-300"}`}>
                  {new Date(task.deadline).getTime() < now ? "Overdue — was due " : "Due "}{formatDue(task.deadline, now)}
                </p>
              )}
              {task.notes && <p className="mt-2 line-clamp-3 text-sm text-slate-500 dark:text-slate-400">{task.notes}</p>}
            </div>
            <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Still worth doing now?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ACTIONS.map(({ id, key, label: text, icon: Icon, tone }) => (
                <button key={id} type="button" onClick={() => act(id)} className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors ${tone}`}>
                  <Icon className="h-3.5 w-3.5" /> {text} <kbd className="ml-1 rounded bg-black/10 px-1 font-mono text-[10px] uppercase dark:bg-white/10">{key}</kbd>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="py-6 text-center">
            <PartyPopper className="mx-auto h-10 w-10 text-blue-500" />
            <p className="mt-3 text-base font-bold text-slate-900 dark:text-white">{queue.length ? "Review complete" : "Nothing needs attention right now"}</p>
            {queue.length > 0 && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tally.done} done · {tally.moved} rescheduled · {tally.kept} kept</p>
            )}
            <button type="button" onClick={onClose} className="mt-6 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700">Back to board</button>
          </div>
        )}
      </div>
    </div>
  );
}
