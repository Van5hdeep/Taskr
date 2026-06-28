import { ArrowRight, Check, Clock, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useCountdown } from "../hooks/useCountdown";
import type { Task } from "../types/task";
import { UrgencyTag } from "./UrgencyTag";

interface TaskCardProps {
  task: Task;
  darkMode: boolean;
  onToggleSubTask: (taskId: string, subTaskId: string) => void;
  onAction: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  isDeleting?: boolean;
}

export function TaskCard({
  task,
  darkMode,
  onToggleSubTask,
  onAction,
  onDelete,
  isDeleting = false,
}: TaskCardProps) {
  const countdown = useCountdown(task.deadline);
  const completedCount = task.subTasks.filter((s) => s.completed).length;
  const progress =
    task.subTasks.length > 0
      ? (completedCount / task.subTasks.length) * 100
      : 0;

  const cardBase = darkMode
    ? "glass-card-dark bg-slate-900/60 hover:bg-slate-900/80"
    : "glass-card bg-white/80 hover:bg-white/90";

  const countdownColor = countdown.isCritical
    ? darkMode
      ? "text-crimson-light"
      : "text-crimson"
    : countdown.isUrgent
      ? darkMode
        ? "text-orange-400"
        : "text-orange-600"
      : darkMode
        ? "text-slate-400"
        : "text-slate-500";

  return (
    <article
      className={`group rounded-2xl p-5 transition-all duration-200 ${cardBase} ${
        countdown.isCritical
          ? darkMode
            ? "ring-1 ring-crimson/40"
            : "ring-1 ring-crimson/30"
          : ""
      }`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            className={`text-base font-semibold leading-snug sm:text-lg ${
              darkMode ? "text-white" : "text-slate-900"
            }`}
          >
            {task.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <UrgencyTag level={task.urgency} darkMode={darkMode} />
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            disabled={isDeleting}
            aria-label="Clear task"
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              darkMode
                ? "text-slate-400 hover:bg-crimson/20 hover:text-crimson-light"
                : "text-slate-400 hover:bg-crimson/10 hover:text-crimson"
            } disabled:opacity-50`}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div
          className={`flex items-center gap-2 font-mono text-sm font-medium ${countdownColor}`}
        >
          <Clock className="h-4 w-4 shrink-0" />
          <span>{countdown.label}</span>
          {countdown.isCritical && (
            <span className="animate-pulse text-xs font-bold uppercase tracking-wider">
              Critical
            </span>
          )}
        </div>

        <div
          className={`flex items-center gap-2 text-xs ${
            darkMode ? "text-slate-500" : "text-slate-400"
          }`}
        >
          <div
            className={`h-1.5 w-16 overflow-hidden rounded-full ${
              darkMode ? "bg-slate-700" : "bg-slate-200"
            }`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-electric to-electric-light transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span>
            {completedCount}/{task.subTasks.length}
          </span>
        </div>
      </div>

      <ul className="mb-5 space-y-2.5">
        {task.subTasks.map((sub) => (
          <li key={sub.id}>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 transition-colors ${
                darkMode ? "hover:bg-slate-800/60" : "hover:bg-slate-50"
              }`}
            >
              <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                <input
                  type="checkbox"
                  checked={sub.completed}
                  onChange={() => onToggleSubTask(task.id, sub.id)}
                  className="peer sr-only"
                />
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all peer-checked:border-electric peer-checked:bg-electric ${
                    darkMode
                      ? "border-slate-600 peer-checked:border-electric-light peer-checked:bg-electric-light"
                      : "border-slate-300"
                  }`}
                >
                  {sub.completed && (
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  )}
                </span>
              </span>
              <span
                className={`text-sm leading-snug ${
                  sub.completed
                    ? darkMode
                      ? "text-slate-500 line-through"
                      : "text-slate-400 line-through"
                    : darkMode
                      ? "text-slate-300"
                      : "text-slate-700"
                }`}
              >
                {sub.label}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onAction(task.id)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            task.urgency === "Immediate"
              ? "bg-gradient-to-r from-crimson to-crimson-light text-white shadow-md shadow-crimson/25 hover:shadow-lg hover:shadow-crimson/30"
              : "bg-gradient-to-r from-electric to-electric-light text-white shadow-md shadow-electric/25 hover:shadow-lg hover:shadow-electric/30"
          }`}
        >
          {task.actionLabel === "Generate Draft" ? (
            <Sparkles className="h-4 w-4" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          {task.actionLabel}
        </button>
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          disabled={isDeleting}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            darkMode
              ? "bg-slate-800 text-slate-300 ring-1 ring-slate-700 hover:bg-crimson/20 hover:text-crimson-light"
              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 hover:bg-crimson/10 hover:text-crimson"
          } disabled:opacity-50`}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Clear Task
        </button>
      </div>
    </article>
  );
}
