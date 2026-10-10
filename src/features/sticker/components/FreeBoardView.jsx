import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Calendar, Check, Clock, Maximize2 } from "lucide-react";
import StickerWorkspace from "../../../components/StickerWorkspace";
import { colorMeta } from "../constants";
import { deadlineState, formatCountdown } from "../logic";
import { formatDue } from "../format";
import { useFreeLayout } from "../useFreeLayout";

const CORNERS = ["nw", "ne", "sw", "se"];

function StickyNote({ task, now, onOpen, onToggleComplete, onToggleSubTask }) {
  const color = colorMeta(task.color);
  const state = task.completedAt ? "done" : deadlineState(task.deadline, now);
  const deadlineMs = task.deadline ? new Date(task.deadline).getTime() : null;

  return (
    <article className={`group flex h-full w-full flex-col overflow-hidden rounded-2xl border p-4 shadow-md ${color.card} ${state === "overdue" ? "ring-2 ring-red-500" : ""} ${task.completedAt ? "opacity-60" : ""}`}>
      <div className="mb-2 flex items-start gap-2">
        <button
          type="button"
          onClick={() => onToggleComplete(task.id)}
          aria-label={task.completedAt ? `Reopen ${task.title}` : `Complete ${task.title}`}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${task.completedAt ? "border-emerald-600 bg-emerald-600 text-white" : "border-current/40 border-black/25 text-transparent hover:text-emerald-700 dark:border-white/30"}`}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </button>
        <h3 className={`flex-1 text-base font-bold leading-snug ${task.completedAt ? "line-through" : ""}`}>{task.title}</h3>
        <button type="button" onClick={() => onOpen(task.id)} aria-label={`Edit ${task.title}`} className="rounded-lg p-1 opacity-0 transition-opacity hover:bg-black/10 group-hover:opacity-100 focus:opacity-100 dark:hover:bg-white/10">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {task.notes && <p className="mb-2 line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed opacity-80">{task.notes}</p>}
      {task.subTasks.length > 0 && (
        <ul className="mb-2 space-y-1 overflow-y-auto">
          {task.subTasks.map((st) => (
            <li key={st.id}>
              <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 text-xs hover:bg-black/5 dark:hover:bg-white/5">
                <input type="checkbox" checked={st.done} onChange={() => onToggleSubTask(task.id, st.id)} className="mt-0.5 accent-blue-600" />
                <span className={st.done ? "line-through opacity-60" : ""}>{st.label}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-black/5 pt-2 text-[11px] font-semibold dark:border-white/10">
        {task.deadline ? (
          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDue(task.deadline, now)}</span>
        ) : <span className="opacity-50">No date</span>}
        {state === "overdue" && (
          <span className="inline-flex items-center gap-1 font-mono text-red-600 dark:text-red-400"><AlertTriangle className="h-3 w-3" />OVERDUE</span>
        )}
        {state === "soon" && (
          <span className="inline-flex items-center gap-1 font-mono text-amber-700 dark:text-amber-300"><Clock className="h-3 w-3" />{formatCountdown(deadlineMs - now)}</span>
        )}
      </div>
    </article>
  );
}

export default function FreeBoardView({ tasks, now, hasActiveFilters, onOpen, onToggleComplete, onToggleSubTask, onCommitLayout }) {
  const canvasRef = useRef(null);
  const [canvasWidth, setCanvasWidth] = useState(900);
  const [height, setHeight] = useState(680);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setCanvasWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const free = useFreeLayout(tasks, canvasWidth, onCommitLayout);

  return (
    <StickerWorkspace
      taskCount={tasks.length}
      hasActiveFilters={hasActiveFilters}
      maxBottom={free.maxBottom}
      canvasRef={canvasRef}
      onCanvasClick={free.deselect}
      height={height}
      onHeightChange={setHeight}
    >
      {tasks.map((task) => {
        const pos = free.layout[task.id];
        if (!pos) return null;
        const active = free.activeId === task.id;
        return (
          <div
            key={task.id}
            className={`sticker-wrapper absolute ${active && free.isDragging ? "sticker-dragging" : free.selectedId === task.id ? "sticker-idle sticker-selected" : "sticker-idle"}`}
            style={{ left: pos.x, top: pos.y, width: pos.w, height: pos.h, zIndex: pos.z || 1, touchAction: "none" }}
            onPointerDown={(event) => free.startDrag(task.id, event)}
            onDoubleClick={(event) => { if (!event.target.closest("button, input, label")) onOpen(task.id); }}
          >
            <StickyNote task={task} now={now} onOpen={onOpen} onToggleComplete={onToggleComplete} onToggleSubTask={onToggleSubTask} />
            {CORNERS.map((corner) => (
              <div key={corner} className={`resize-handle resize-handle-${corner}`} onPointerDown={(event) => free.startResize(task.id, corner, event)} />
            ))}
          </div>
        );
      })}
    </StickerWorkspace>
  );
}
