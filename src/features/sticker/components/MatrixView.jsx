import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { QUADRANTS, QUADRANT_SOFT_CAP, compareTasks, flagsForQuadrant, quadrantOf } from "../logic";
import TaskCard from "./TaskCard";

const TONES = {
  do: "border-red-200 bg-red-50/60 dark:border-red-500/20 dark:bg-red-950/20",
  schedule: "border-amber-200 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-950/20",
  delegate: "border-sky-200 bg-sky-50/60 dark:border-sky-500/20 dark:bg-sky-950/20",
  later: "border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]",
};
const TITLE_TONES = {
  do: "text-red-700 dark:text-red-300",
  schedule: "text-amber-700 dark:text-amber-300",
  delegate: "text-sky-700 dark:text-sky-300",
  later: "text-slate-600 dark:text-slate-300",
};

/** Eisenhower 2×2. Drag a card between quadrants to change its urgency/importance. */
export default function MatrixView({ tasks, now, onOpen, onToggleComplete, onMove }) {
  const [dragOver, setDragOver] = useState(null);

  const byQuadrant = Object.fromEntries(QUADRANTS.map((q) => [q.id, []]));
  for (const task of tasks) byQuadrant[quadrantOf(task)].push(task);
  for (const list of Object.values(byQuadrant)) list.sort((a, b) => compareTasks(a, b, now));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {QUADRANTS.map((quadrant) => {
        const list = byQuadrant[quadrant.id];
        const overCap = list.filter((task) => !task.completedAt).length > QUADRANT_SOFT_CAP;
        return (
          <section
            key={quadrant.id}
            aria-label={quadrant.label}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDragOver(quadrant.id); }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragOver(null); }}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(null);
              const id = event.dataTransfer.getData("text/taskr-task");
              const task = tasks.find((item) => item.id === id);
              if (task && quadrantOf(task) !== quadrant.id) onMove(id, flagsForQuadrant(quadrant.id));
            }}
            className={`flex min-h-[220px] flex-col rounded-2xl border p-3 transition-shadow ${TONES[quadrant.id]} ${dragOver === quadrant.id ? "ring-4 ring-blue-400/40" : ""}`}
          >
            <header className="mb-3 flex items-baseline justify-between gap-2 px-1">
              <div>
                <h3 className={`text-sm font-extrabold ${TITLE_TONES[quadrant.id]}`}>{quadrant.label}</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{quadrant.hint}</p>
              </div>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">{list.length}</span>
            </header>
            {overCap && (
              <p className="mb-2 flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" /> More than {QUADRANT_SOFT_CAP} open here — can any move to Later?
              </p>
            )}
            <div className="flex flex-1 flex-col gap-2">
              {list.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  now={now}
                  onOpen={onOpen}
                  onToggleComplete={onToggleComplete}
                  draggable
                  onDragStart={(event) => { event.dataTransfer.setData("text/taskr-task", task.id); event.dataTransfer.effectAllowed = "move"; }}
                />
              ))}
              {!list.length && (
                <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300/80 p-4 text-center text-xs text-slate-400 dark:border-white/10">
                  Drop tasks here
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
