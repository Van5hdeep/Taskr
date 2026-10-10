import { useMemo, useState } from "react";
import { QUADRANTS, compareTasks, quadrantOf } from "../logic";
import TaskCard from "./TaskCard";

const GROUPS = [
  { id: "due", label: "By due date" },
  { id: "quadrant", label: "By priority" },
  { id: "none", label: "No grouping" },
];

const DAY = 24 * 60 * 60 * 1000;

function dueGroup(task, now) {
  if (!task.deadline) return "No date";
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const ms = new Date(task.deadline).getTime();
  if (ms < now && !task.completedAt) return "Overdue";
  if (ms < start.getTime() + DAY) return "Today";
  if (ms < start.getTime() + 2 * DAY) return "Tomorrow";
  if (ms < start.getTime() + 7 * DAY) return "This week";
  return "Later";
}
const DUE_ORDER = ["Overdue", "Today", "Tomorrow", "This week", "Later", "No date"];

export default function ListView({ tasks, now, onOpen, onToggleComplete }) {
  const [grouping, setGrouping] = useState("due");

  const groups = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => compareTasks(a, b, now));
    if (grouping === "none") return [{ id: "all", label: null, items: sorted }];
    if (grouping === "quadrant") {
      return QUADRANTS.map((q) => ({ id: q.id, label: q.label, items: sorted.filter((task) => quadrantOf(task) === q.id) }));
    }
    return DUE_ORDER.map((label) => ({ id: label, label, items: sorted.filter((task) => dueGroup(task, now) === label) }));
  }, [grouping, now, tasks]);

  const quadrantLabel = (task) => QUADRANTS.find((q) => q.id === quadrantOf(task))?.label;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f1733]">
      <div className="mb-4 flex justify-end">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-white/5" role="radiogroup" aria-label="Group tasks">
          {GROUPS.map((group) => (
            <button key={group.id} type="button" role="radio" aria-checked={grouping === group.id} onClick={() => setGrouping(group.id)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${grouping === group.id ? "bg-white text-blue-700 shadow-sm dark:bg-[#1c2650] dark:text-blue-300" : "text-slate-500 hover:text-slate-800 dark:text-slate-400"}`}>
              {group.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-6">
        {groups.filter((group) => group.items.length).map((group) => (
          <section key={group.id}>
            {group.label && (
              <h3 className={`mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider ${group.id === "Overdue" ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
                {group.label} <span className="font-semibold text-slate-400">{group.items.length}</span>
              </h3>
            )}
            <div className="grid gap-2">
              {group.items.map((task) => (
                <TaskCard key={task.id} task={task} now={now} onOpen={onOpen} onToggleComplete={onToggleComplete} showQuadrant={grouping !== "quadrant" ? quadrantLabel(task) : null} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
