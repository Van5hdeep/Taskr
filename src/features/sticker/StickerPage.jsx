import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, Calendar, Check, Clock, Loader2, Pencil, Plus, Trash2, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth/AuthProvider";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import StatusBanner from "../../components/ui/StatusBanner";
import StickerWorkspace from "../../components/StickerWorkspace";
import useStickerInteractions from "../../hooks/useStickerInteractions";
import WorkspaceSaveModal from "../../components/WorkspaceSaveModal";
import SaveButton from "../../components/ui/SaveButton";
import { useSavedWorkspaces } from "../home/useSavedWorkspaces";

// Legacy sticker board (moved out of App.jsx in Phase 0). Phase 2 rebuilds it
// on the boards/tasks schema described in .planning/04-sticker.md.

const TASK_META_PREFIX = "tasker_task_meta_";

const STICKER_COLORS = [
  { id: "red", label: "Red", hex: "#ef4444", class: "bg-red-100 text-red-900 border-red-300 dark:bg-red-900/40 dark:text-red-100 dark:border-red-700/50" },
  { id: "yellow", label: "Yellow", hex: "#eab308", class: "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-200 dark:border-yellow-700/50" },
  { id: "blue", label: "Blue", hex: "#2563eb", class: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700/50" },
  { id: "green", label: "Green", hex: "#16a34a", class: "bg-green-100 text-green-900 border-green-300 dark:bg-green-900/40 dark:text-green-200 dark:border-green-700/50" },
  { id: "orange", label: "Orange", hex: "#f97316", class: "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-700/50" },
  { id: "purple", label: "Purple", hex: "#8b5cf6", class: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-700/50" },
  { id: "pink", label: "Pink", hex: "#ec4899", class: "bg-pink-100 text-pink-900 border-pink-300 dark:bg-pink-900/40 dark:text-pink-200 dark:border-pink-700/50" },
  { id: "grey", label: "Grey", hex: "#64748b", class: "bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-900/40 dark:text-slate-200 dark:border-slate-700/50" },
  { id: "white", label: "White", hex: "#f8fafc", class: "bg-white text-zinc-900 border-zinc-200 dark:bg-[#161f42] dark:text-slate-200 dark:border-blue-500/20" },
];

const PRIORITY_FILTERS = [
  { id: "all", label: "All Priorities" },
  { id: "urgent", label: "Urgent", pillClass: "bg-red-50/90 border-red-200/60 text-red-700 dark:bg-red-950/40 dark:border-red-500/30 dark:text-red-300" },
  { id: "important", label: "Important", pillClass: "bg-amber-50/90 border-amber-200/60 text-amber-800 dark:bg-amber-950/35 dark:border-amber-500/25 dark:text-amber-300" },
  { id: "not-important", label: "Not Important", pillClass: "bg-emerald-50/90 border-emerald-200/60 text-emerald-700 dark:bg-emerald-950/35 dark:border-emerald-500/25 dark:text-emerald-300" },
];

const DATE_FILTERS = [
  { id: "all", label: "All Dates" },
  { id: "today", label: "Due Today" },
  { id: "week", label: "Due Within a Week" },
  { id: "month", label: "Due Within a Month" },
];

function createTaskTitle(description) {
  const cleaned = String(description || "")
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_\u0060~()]/g, "");
  const words = cleaned.split(/\s+/).filter((word) => word.length > 2);
  if (!words.length) return "Quick Task";

  return words
    .slice(0, 3)
    .map((word, index) => index === 0
      ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      : word.toLowerCase())
    .join(" ");
}

function getStickerClass(colorId) {
  const match = STICKER_COLORS.find(c => c.id === colorId);
  return match ? match.class : STICKER_COLORS[0].class;
}

function dateKey(d) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}

const playNotificationSound = () => {
  try {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav");
    audio.volume = 0.4;
    audio.play();
  } catch (err) {
    console.warn("Audio playback blocked by browser autoplay policy:", err);
  }
};

const formatCountdown = (milliseconds) => {
  if (milliseconds <= 0) return "00:00:00";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map(v => v < 10 ? "0" + v : v)
    .join(":");
};

function normalizeSubTasks(subTasks) {
  const activeSubTasks = Array.isArray(subTasks) ? subTasks : [];
  return activeSubTasks.map((st, index) => {
    if (typeof st === "string") return { id: String(index), label: st, completed: false };
    return { id: String(index), label: st.label || st.text || "", completed: Boolean(st.completed) };
  });
}

function mapSupabaseTask(row, meta = {}) {
  const taskMeta = meta[row.id] ?? {};
  const urgencyScore = row.urgency_score;
  return {
    id: row.id,
    title: row.title || "Untitled Task",
    rawInput: row.raw_input || "",
    deadline: row.deadline ? new Date(row.deadline) : new Date(),
    createdAt: new Date(row.created_at || Date.now()),
    urgencyScore,
    stickerColor: taskMeta.color || "yellow",
    plannedDate: taskMeta.plannedDate ?? dateKey(row.deadline),
    subTasks: normalizeSubTasks(row.sub_tasks),
    isCompleted: row.is_completed,
  };
}

function toDbSubTasks(subTasks) {
  return subTasks.map(({ label, completed }) => ({ label, completed }));
}

function sortByDeadline(taskList) {
  return [...taskList].sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
}

function matchesPriorityFilter(task, priorityFilter) {
  if (priorityFilter === "all") return true;
  if (priorityFilter === "urgent") return task.urgencyScore >= 8;
  if (priorityFilter === "important") return task.urgencyScore >= 5 && task.urgencyScore < 8;
  if (priorityFilter === "not-important") return task.urgencyScore < 5;
  return true;
}

function matchesDateFilter(task, dateFilter) {
  if (dateFilter === "all") return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(task.deadline);
  deadline.setHours(0, 0, 0, 0);
  if (dateFilter === "today") return dateKey(deadline) === dateKey(today);
  if (dateFilter === "week") {
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return deadline >= today && deadline <= weekEnd;
  }
  if (dateFilter === "month") {
    const monthEnd = new Date(today);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    return deadline >= today && deadline <= monthEnd;
  }
  return true;
}

function filterTasks(taskList, priorityFilter, dateFilter) {
  return taskList.filter(
    (task) => matchesPriorityFilter(task, priorityFilter) && matchesDateFilter(task, dateFilter)
  );
}

function toIsoDeadline(deadlineStr) {
  if (!deadlineStr) return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return new Date(deadlineStr).toISOString();
}

function formatDeadline(date) {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── Task Meta (localStorage per-task metadata) ───────────────────────────────

function readTaskMeta(userId) {
  try {
    const raw = localStorage.getItem(`${TASK_META_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeTaskMeta(userId, meta) {
  localStorage.setItem(`${TASK_META_PREFIX}${userId}`, JSON.stringify(meta));
}

function PanicDump({ t, onSubmit, isSubmitting, selectedDate }) {
  const [manualTitle, setManualTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    if (selectedDate) {
      setDeadline(`${selectedDate}T09:00`);
    }
  }, [selectedDate]);
  const [stickerColor, setStickerColor] = useState("yellow");
  const [subTaskInput, setSubTaskInput] = useState("");
  const [pendingSubTasks, setPendingSubTasks] = useState([]);

  const addSubTask = () => {
    const text = subTaskInput.trim();
    if (!text) return;
    setPendingSubTasks((prev) => [...prev, { text, completed: false }]);
    setSubTaskInput("");
  };

  const removeSubTask = (index) => {
    setPendingSubTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubTaskKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSubTask();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim() || isSubmitting) return;
    try {
      // Pass stickerColor instead of urgencyLevel
      await onSubmit(manualTitle.trim(), description.trim(), deadline, stickerColor, pendingSubTasks);
      setManualTitle("");
      setDescription("");
      setDeadline("");
      setStickerColor("yellow");
      setPendingSubTasks([]);
      setSubTaskInput("");
    } catch { /* parent handles */ }
  };

  return (
    <section className={`rounded-2xl p-5 ${t.card}`}>
      <h2 className={`text-sm font-bold ${t.textPrimary}`}>Task Dump</h2>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className={`mb-1.5 block text-xs font-semibold uppercase ${t.textMuted}`}>Task Title (optional)</label>
          <input
            type="text"
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            placeholder="Type a custom title or leave blank for an automatic title"
            className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 ${t.input}`}
          />
        </div>
        <div>
          <label className={`mb-1.5 block text-xs font-semibold uppercase ${t.textMuted}`}>Task Description</label>
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Dump everything you need to get done…" className={`w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 ${t.input}`} />
        </div>

        {/* Subtask pre-builder */}
        <div>
          <label className={`mb-1.5 block text-xs font-semibold uppercase ${t.textMuted}`}>Subtasks (optional)</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={subTaskInput}
              onChange={(e) => setSubTaskInput(e.target.value)}
              onKeyDown={handleSubTaskKeyDown}
              placeholder="Add a subtask…"
              className={`flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${t.input}`}
            />
            <button
              type="button"
              onClick={addSubTask}
              disabled={!subTaskInput.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {pendingSubTasks.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {pendingSubTasks.map((sub, idx) => (
                <li key={idx} className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs ${t.cardMuted}`}>
                  <span className="text-sm font-medium">{sub.text}</span>
                  <button type="button" onClick={() => removeSubTask(idx)} className="text-red-400 hover:text-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className={`mb-1.5 block text-xs font-semibold uppercase ${t.textMuted}`}>Deadline</label>
          <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 ${t.input}`} />
        </div>
        <div>
          <label className={`mb-3 block text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Select Sticker Color</label>
          <div className="flex flex-wrap gap-3">
            {STICKER_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                onClick={() => setStickerColor(color.id)}
                className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${stickerColor === color.id ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#161f42] scale-110" : ""}`}
                style={{ backgroundColor: color.hex, borderColor: color.id === "white" ? "#cbd5e1" : "rgba(0,0,0,0.16)" }}
                aria-label={color.label}
                title={color.label}
              />
            ))}
          </div>
        </div>
        <button type="submit" disabled={!description.trim() || isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading task...</> : "Upload Task"}
        </button>
      </form>
    </section>
  );
}



// ─── Stickers ──────────────────────────────────────────────────────────────────

function TaskFilterBar({ priorityFilter, dateFilter, onPriorityChange, onDateChange, t, dark }) {
  const inactivePill = dark
    ? "border-blue-500/15 bg-[#161f42]/40 text-slate-400 hover:border-blue-500/30 hover:text-slate-200"
    : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-slate-700";

  return (
    <div className={`mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border px-4 py-3 ${dark ? "border-blue-500/15 bg-[#0d1530]/40" : "border-slate-200/80 bg-white/60"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`mr-1 text-[10px] font-bold uppercase tracking-wider ${t.textMuted}`}>Priority</span>
        {PRIORITY_FILTERS.map((filter) => {
          const isActive = priorityFilter === filter.id;
          const activeClass = filter.pillClass
            ? `${filter.pillClass} border font-semibold ring-2 ring-blue-500/30`
            : `${dark ? "bg-blue-600/20 border-blue-500/40 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"} border font-semibold ring-2 ring-blue-500/30`;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onPriorityChange(filter.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${isActive ? activeClass : inactivePill}`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
      <div className={`hidden h-5 w-px sm:block ${dark ? "bg-blue-500/15" : "bg-slate-200"}`} />
      <div className="flex flex-wrap items-center gap-2">
        <span className={`mr-1 text-[10px] font-bold uppercase tracking-wider ${t.textMuted}`}>Date</span>
        {DATE_FILTERS.map((filter) => {
          const isActive = dateFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onDateChange(filter.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                isActive
                  ? `${dark ? "bg-blue-600/20 border-blue-500/40 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"} font-semibold ring-2 ring-blue-500/30`
                  : inactivePill
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StickerCard({ task, dark, t, onToggleSubTask, onDelete, onEdit, isDeleting, currentTime }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editRawInput, setEditRawInput] = useState(task.rawInput);
  const [editColor, setEditColor] = useState(task.stickerColor || "yellow");

  const verifiedSubTasks = task && Array.isArray(task.subTasks) ? task.subTasks : [];
  const deadlineMs = task?.deadline instanceof Date ? task.deadline.getTime() : new Date().getTime();
  
  const now = currentTime || Date.now();
  const TWENTY_FOUR_HOURS_MS = 86400000;
  const timePassedSinceDeadline = now - deadlineMs;
  const remaining24h = Math.max(0, TWENTY_FOUR_HOURS_MS - timePassedSinceDeadline);
  const isOvertime = now > deadlineMs;
  const showCountdown = (deadlineMs - now) <= TWENTY_FOUR_HOURS_MS && (deadlineMs - now) >= 0;
  
  const handleSave = () => {
    if (onEdit) onEdit(task.id, { title: editTitle, rawInput: editRawInput, color: editColor });
    setIsEditing(false);
  };

  return (
    <article className={`group relative flex h-full w-full flex-col rounded-2xl p-4 shadow-md transition-all overflow-hidden ${getStickerClass(task.stickerColor)} ${isOvertime ? "border-2 border-red-500" : ""}`}>
      
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 transition-all group-hover:opacity-100 z-10">
        {!isEditing && (
          <button type="button" onClick={() => setIsEditing(true)} disabled={isDeleting} className="rounded-lg p-1.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-50" aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={() => onDelete(task.id)} disabled={isDeleting} className="rounded-lg p-1.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-50 text-red-500" aria-label="Delete">
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>

      {isEditing ? (
        <div className="flex flex-col flex-1 gap-2 mt-6">
          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="rounded p-1.5 text-sm font-bold bg-black/5 dark:bg-black/20 outline-none focus:ring-2 focus:ring-blue-500" />
          <textarea value={editRawInput} onChange={(e) => setEditRawInput(e.target.value)} className="rounded p-1.5 text-xs bg-black/5 dark:bg-black/20 flex-1 outline-none resize-none focus:ring-2 focus:ring-blue-500" />
          
          <div className="flex flex-wrap gap-1 mt-1">
            {STICKER_COLORS.map(color => (
              <button
                key={color.id}
                onClick={() => setEditColor(color.id)}
                className={`w-5 h-5 rounded-full ${editColor === color.id ? "ring-2 ring-blue-500" : ""}`}
                style={{ backgroundColor: color.hex, borderColor: "rgba(0,0,0,0.1)", borderWidth: 1 }}
                aria-label={color.label}
                title={color.label}
              />
            ))}
          </div>

          <SaveButton onClick={handleSave} className="mt-2 w-full" />
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-start justify-between gap-2 pr-16">
            {isOvertime ? (
              <h3 className="text-base font-bold leading-snug text-red-600 dark:text-red-400 animate-pulse uppercase">OVERTIME</h3>
            ) : (
              <h3 className="text-base font-bold leading-snug">{task.title}</h3>
            )}
          </div>
          <p className="flex-1 text-xs leading-relaxed overflow-y-auto whitespace-pre-wrap">{task.rawInput}</p>
          {verifiedSubTasks.length > 0 && (
            <ul className="mt-3 space-y-1.5">
          {Array.isArray(verifiedSubTasks) && verifiedSubTasks.map((sub) => (
                <li key={sub.id}>
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-0.5 hover:bg-white/10 transition-colors">
                    <input type="checkbox" checked={sub.completed} onChange={() => onToggleSubTask(task.id, sub.id)} className="peer sr-only" />
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-zinc-300 bg-white peer-checked:border-blue-600 peer-checked:bg-blue-600 transition-colors">
                      {sub.completed && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                    </span>
                    <span className={`text-xs ${sub.completed ? "line-through opacity-60" : "transition-all"}`}>{sub.text || sub.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          
          <div className={`mt-3 flex items-center justify-between border-t pt-3 text-[11px] font-semibold ${dark ? "border-blue-500/15 text-slate-400" : "border-black/5 text-zinc-600"}`}>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-500" />
              {formatDeadline(task.deadline)}
            </div>
            {isOvertime && (
               <div className="flex items-center gap-1 text-red-500 font-mono animate-pulse">
                 <AlertTriangle className="h-3 w-3" />
                 {formatCountdown(remaining24h)}
               </div>
            )}
            {showCountdown && !isOvertime && (
               <div className="flex items-center gap-1 text-amber-500 font-mono">
                 <Clock className="h-3 w-3" />
                 {formatCountdown(deadlineMs - now)}
               </div>
            )}
          </div>
        </>
      )}
    </article>
  );
}

function StickerGrid({ tasks, t, dark, isLoading, deletingTaskId, onToggleSubTask, onDelete, onEdit, currentTime, layout, selectedId, activeId, isDragging, onDragStart, onResizeStart, onBringToFront }) {
  if (isLoading && !tasks.length) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-600" />
        <p className={`text-sm ${t.textMuted}`}>Loading stickers…</p>
      </div>
    );
  }
  return (
    <>
      {tasks.map((task) => {
        const pos = layout[task.id];
        if (!pos) return null;
        const isActive = activeId === task.id;
        const isSelected = selectedId === task.id;
        const wrapperClass = `sticker-wrapper absolute ${
          isActive && isDragging ? "sticker-dragging" : isSelected ? "sticker-idle sticker-selected" : "sticker-idle"
        }`;
        return (
          <div
            key={task.id}
            className={wrapperClass}
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              width: `${pos.w}px`,
              height: `${pos.h}px`,
              zIndex: pos.zIndex || 1,
            }}
            onPointerDown={(e) => onDragStart(task.id, e)}
            onClick={() => onBringToFront(task.id)}
          >
            <StickerCard task={task} dark={dark} t={t} onToggleSubTask={onToggleSubTask} onDelete={onDelete} onEdit={onEdit} isDeleting={deletingTaskId === task.id} currentTime={currentTime} />
            {/* Resize handles at four corners */}
            <div className="resize-handle resize-handle-nw" onPointerDown={(e) => onResizeStart(task.id, "nw", e)} />
            <div className="resize-handle resize-handle-ne" onPointerDown={(e) => onResizeStart(task.id, "ne", e)} />
            <div className="resize-handle resize-handle-sw" onPointerDown={(e) => onResizeStart(task.id, "sw", e)} />
            <div className="resize-handle resize-handle-se" onPointerDown={(e) => onResizeStart(task.id, "se", e)} />
          </div>
        );
      })}
    </>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function StickerPage({ t, dark }) {
  const { userId } = useAuth();
  const confirm = useConfirm();
  const { savedWorkspaces, saveWorkspace } = useSavedWorkspaces();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [error, setError] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [matrixHeight, setMatrixHeight] = useState(680);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [showSaveSticker, setShowSaveSticker] = useState(false);

  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  const filteredTasks = useMemo(
    () => sortByDeadline(filterTasks(tasks, priorityFilter, dateFilter)),
    [tasks, priorityFilter, dateFilter]
  );
  const hasActiveFilters = priorityFilter !== "all" || dateFilter !== "all";

  const canvasRef = useRef(null);
  const filteredTaskIds = useMemo(() => filteredTasks.map((task) => String(task.id)), [filteredTasks]);
  const stickerInteractions = useStickerInteractions(filteredTaskIds, userId, canvasRef.current?.offsetWidth || 800);

  const fetchTasks = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    const meta = readTaskMeta(userId);
    const { data, error: fetchError } = await supabase.from("tasks").select("*").eq("user_id", userId).order("deadline", { ascending: true });
    if (fetchError) setError(fetchError.message);
    else setTasks(sortByDeadline((data ?? []).map((row) => mapSupabaseTask(row, meta))));
    setIsLoading(false);
  }, [userId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Deadline milestones. Overdue tasks are flagged on the card; nothing is
  // deleted automatically any more.
  useEffect(() => {
    const alertsKey = `taskr_alerts_${userId}`;
    const tick = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);
      let alerts = {};
      try { alerts = JSON.parse(localStorage.getItem(alertsKey) || "{}"); } catch { alerts = {}; }
      let changed = false;
      tasksRef.current.forEach((task) => {
        if (task.isCompleted) return;
        const deadlineMs = task.deadline.getTime();
        const createdMs = task.createdAt ? task.createdAt.getTime() : deadlineMs - 86400000;
        const remaining = deadlineMs - now;
        if (now - createdMs >= (deadlineMs - createdMs) / 2 && remaining > 3600000 && !alerts[`${task.id}_half`]) {
          toast.info(`Half-time: "${task.title}"`, { description: "You are halfway through your allocated time." });
          playNotificationSound();
          alerts[`${task.id}_half`] = true;
          changed = true;
        }
        if (remaining <= 3600000 && remaining > 0 && !alerts[`${task.id}_1h`]) {
          toast.warning(`1 hour left: "${task.title}"`, { description: "Wrap it up!" });
          playNotificationSound();
          alerts[`${task.id}_1h`] = true;
          changed = true;
        }
      });
      if (changed) localStorage.setItem(alertsKey, JSON.stringify(alerts));
    }, 1000);
    return () => clearInterval(tick);
  }, [userId]);

  const handleCreateTask = useCallback(async (manualTitle, rawInput, deadlineStr, stickerColor, userSubTasks = []) => {
    if (!userId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const deadline = toIsoDeadline(deadlineStr);
      const subTasksPayload = userSubTasks.map((st) => ({ text: st.text || st.label, completed: false }));
      const { data: insertedData, error: dbError } = await supabase.from("tasks").insert([{
        user_id: userId,
        title: manualTitle || createTaskTitle(rawInput),
        raw_input: rawInput,
        deadline,
        urgency_score: 5,
        sub_tasks: subTasksPayload,
        is_completed: false,
      }]).select();
      if (dbError) throw new Error(dbError.message);
      if (insertedData?.length) {
        const fresh = insertedData[0];
        const meta = readTaskMeta(userId);
        meta[fresh.id] = { color: stickerColor, plannedDate: dateKey(new Date(deadline)), createdAt: Date.now() };
        writeTaskMeta(userId, meta);
        setTasks((prev) => sortByDeadline([mapSupabaseTask(fresh, meta), ...prev]));
      }
    } catch (err) {
      setError(err.message || "Failed to create sticker.");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [userId]);

  const handleEditTask = useCallback(async (taskId, updates) => {
    if (!userId) return;
    const meta = readTaskMeta(userId);
    meta[taskId] = { ...meta[taskId], color: updates.color };
    writeTaskMeta(userId, meta);
    setTasks((prev) => prev.map((tk) => tk.id === taskId ? { ...tk, title: updates.title, rawInput: updates.rawInput, stickerColor: updates.color } : tk));
    const { data, error: updateError } = await supabase.from("tasks")
      .update({ title: updates.title, raw_input: updates.rawInput })
      .eq("id", taskId).eq("user_id", userId).select().single();
    if (updateError) setError(updateError.message);
    else setTasks((prev) => prev.map((tk) => tk.id === taskId ? mapSupabaseTask(data, meta) : tk));
  }, [userId]);

  const handleToggleSubTask = useCallback(async (taskId, subTaskId) => {
    if (!userId) return;
    const task = tasks.find((tk) => tk.id === taskId);
    if (!task) return;
    const previous = tasks;
    const updatedSubTasks = task.subTasks.map((st) => st.id === subTaskId ? { ...st, completed: !st.completed } : st);
    const allDone = updatedSubTasks.length > 0 && updatedSubTasks.every((st) => st.completed);
    setTasks((prev) => prev.map((tk) => tk.id === taskId ? { ...tk, subTasks: updatedSubTasks, isCompleted: allDone } : tk));
    const { data, error: updateError } = await supabase.from("tasks")
      .update({ sub_tasks: toDbSubTasks(updatedSubTasks), is_completed: allDone })
      .eq("id", taskId).eq("user_id", userId).select().single();
    if (updateError) { setTasks(previous); setError(updateError.message); return; }
    const meta = readTaskMeta(userId);
    setTasks((prev) => sortByDeadline(prev.map((tk) => tk.id === taskId ? mapSupabaseTask(data, meta) : tk)));
    if (allDone && await confirm({ title: "All done!", message: "All subtasks finished. Clear this task from your board?", destructive: true, confirmText: "Clear task" })) {
      const { error: deleteError } = await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", userId);
      if (deleteError) setError(deleteError.message);
      else setTasks((prev) => prev.filter((tk) => tk.id !== taskId));
    }
  }, [confirm, tasks, userId]);

  const handleDelete = useCallback(async (taskId) => {
    if (!userId) return;
    const previous = tasks;
    setDeletingTaskId(taskId);
    setTasks((prev) => prev.filter((tk) => tk.id !== taskId));
    const { error: deleteError } = await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", userId);
    setDeletingTaskId(null);
    if (deleteError) { setTasks(previous); setError(deleteError.message); }
  }, [tasks, userId]);

  return (
    <main className="mx-auto w-full max-w-[1680px] px-4 py-6 pb-28 sm:px-6 lg:px-8 xl:px-10">
      <StatusBanner message={error} onDismiss={() => setError(null)} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
        <aside className="space-y-6">
          <PanicDump t={t} onSubmit={handleCreateTask} isSubmitting={isSubmitting} selectedDate="" />
        </aside>
        <section className="flex min-w-0 flex-col">
          <div className="mb-4 flex shrink-0 items-center justify-between">
            <h2 className={`text-sm font-bold ${t.textPrimary}`}>Sticker Matrix</h2>
            <SaveButton onClick={() => setShowSaveSticker(true)} />
          </div>
          <TaskFilterBar priorityFilter={priorityFilter} dateFilter={dateFilter} onPriorityChange={setPriorityFilter} onDateChange={setDateFilter} t={t} dark={dark} />
          <StickerWorkspace
            taskCount={filteredTasks.length}
            hasActiveFilters={hasActiveFilters}
            maxBottom={stickerInteractions.maxBottom}
            canvasRef={canvasRef}
            onCanvasClick={stickerInteractions.deselectAll}
            height={matrixHeight}
            onHeightChange={setMatrixHeight}
          >
            <StickerGrid
              tasks={filteredTasks}
              t={t}
              dark={dark}
              isLoading={isLoading}
              deletingTaskId={deletingTaskId}
              onToggleSubTask={handleToggleSubTask}
              onDelete={handleDelete}
              onEdit={handleEditTask}
              currentTime={currentTime}
              layout={stickerInteractions.layout}
              selectedId={stickerInteractions.selectedId}
              activeId={stickerInteractions.activeId}
              isDragging={stickerInteractions.isDragging}
              onDragStart={stickerInteractions.startDrag}
              onResizeStart={stickerInteractions.startResize}
              onBringToFront={stickerInteractions.bringToFront}
            />
          </StickerWorkspace>
        </section>
      </div>
      {showSaveSticker && (
        <WorkspaceSaveModal
          t={t}
          dark={dark}
          defaultName={savedWorkspaces.find((ws) => ws.id === "sticker")?.name || "My board"}
          onSave={(name) => { saveWorkspace("sticker", name, "Sticker Workspace"); setShowSaveSticker(false); }}
          onCancel={() => setShowSaveSticker(false)}
        />
      )}
    </main>
  );
}
