import { Bell, Calendar, Check, ListChecks, Repeat } from "lucide-react";
import { colorMeta } from "../constants";
import { deadlineState } from "../logic";
import { formatDue } from "../format";

/** Compact task row used by the matrix and list views. */
export default function TaskCard({ task, now, onOpen, onToggleComplete, draggable = false, onDragStart, showQuadrant = null }) {
  const color = colorMeta(task.color);
  const state = task.completedAt ? "done" : deadlineState(task.deadline, now);
  const doneCount = task.subTasks.filter((st) => st.done).length;

  return (
    <article
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={() => onOpen(task.id)}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(task.id); } }}
      tabIndex={0}
      role="button"
      aria-label={`Open ${task.title}`}
      className={`group relative flex cursor-pointer items-start gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-3 text-left shadow-sm transition-all hover:-translate-y-px hover:border-blue-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-white/10 dark:bg-[#141c3d] dark:hover:border-blue-500/40 ${draggable ? "active:cursor-grabbing" : ""} ${task.completedAt ? "opacity-60" : ""}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${color.stripe}`} aria-hidden />
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); onToggleComplete(task.id); }}
        aria-label={task.completedAt ? `Reopen ${task.title}` : `Complete ${task.title}`}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${task.completedAt ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500 dark:border-slate-500"}`}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100 ${task.completedAt ? "line-through" : ""}`}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {showQuadrant && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-white/10 dark:text-slate-300">{showQuadrant}</span>}
          {task.deadline && (
            <span className={`inline-flex items-center gap-1 ${state === "overdue" ? "font-bold text-red-600 dark:text-red-400" : state === "soon" ? "text-amber-600 dark:text-amber-400" : ""}`}>
              <Calendar className="h-3 w-3" />
              {state === "overdue" ? `Overdue · ${formatDue(task.deadline, now)}` : formatDue(task.deadline, now)}
            </span>
          )}
          {task.subTasks.length > 0 && (
            <span className="inline-flex items-center gap-1"><ListChecks className="h-3 w-3" />{doneCount}/{task.subTasks.length}</span>
          )}
          {task.recurrence && <Repeat className="h-3 w-3" aria-label="Repeats" />}
          {task.remindAt && !task.completedAt && <Bell className="h-3 w-3" aria-label="Has reminder" />}
          {task.tags.map((tag) => <span key={tag} className="text-blue-600 dark:text-blue-300">#{tag}</span>)}
        </div>
      </div>
    </article>
  );
}
