import { ListTodo, Loader2 } from "lucide-react";
import type { Task } from "../types/task";
import { TaskCard } from "./TaskCard";

interface ActiveActionPlanProps {
  tasks: Task[];
  darkMode: boolean;
  isLoading?: boolean;
  deletingTaskId?: string | null;
  onToggleSubTask: (taskId: string, subTaskId: string) => void;
  onAction: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

export function ActiveActionPlan({
  tasks,
  darkMode,
  isLoading = false,
  deletingTaskId = null,
  onToggleSubTask,
  onAction,
  onDelete,
}: ActiveActionPlanProps) {
  const immediateCount = tasks.filter((t) => t.urgency === "Immediate").length;

  return (
    <section aria-labelledby="action-plan-heading">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              darkMode ? "bg-electric/20 text-electric-glow" : "bg-electric/10 text-electric"
            }`}
          >
            <ListTodo className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2
              id="action-plan-heading"
              className={`text-base font-semibold sm:text-lg ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Active Action Plan
            </h2>
            <p
              className={`mt-0.5 text-sm ${
                darkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {tasks.length} task{tasks.length !== 1 ? "s" : ""} prioritized by
              AI urgency
            </p>
          </div>
        </div>

        {immediateCount > 0 && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              darkMode
                ? "bg-crimson/20 text-crimson-light ring-1 ring-crimson/30"
                : "bg-crimson/10 text-crimson ring-1 ring-crimson/20"
            }`}
          >
            {immediateCount} immediate
          </span>
        )}
      </div>

      {isLoading ? (
        <div
          className={`flex flex-col items-center justify-center rounded-2xl py-20 ${
            darkMode ? "text-slate-400" : "text-slate-500"
          }`}
        >
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-electric" />
          <p className="text-sm font-medium">Loading your action plan…</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:gap-5">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                darkMode={darkMode}
                onToggleSubTask={onToggleSubTask}
                onAction={onAction}
                onDelete={onDelete}
                isDeleting={deletingTaskId === task.id}
              />
            ))}
          </div>

          {tasks.length === 0 && (
            <div
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16 text-center ${
                darkMode
                  ? "border-slate-700 text-slate-500"
                  : "border-slate-200 text-slate-400"
              }`}
            >
              <ListTodo className="mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm font-medium">No active tasks yet</p>
              <p className="mt-1 text-xs">Dump your chaos to get started</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
