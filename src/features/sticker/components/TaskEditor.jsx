import { useEffect, useRef, useState } from "react";
import { Archive, ArchiveRestore, Bell, Calendar, Check, GripVertical, Plus, Repeat, Trash2, X } from "lucide-react";
import { STICKER_COLORS } from "../constants";
import { QUADRANTS, RECURRENCE_OPTIONS, flagsForQuadrant, newSubTaskId, quadrantOf } from "../logic";
import { fromLocalInput, toLocalInput } from "../format";

const REMINDER_PRESETS = [
  { id: "", label: "No reminder" },
  { id: "0", label: "At due time" },
  { id: "15", label: "15 min before" },
  { id: "60", label: "1 hour before" },
  { id: "1440", label: "1 day before" },
  { id: "custom", label: "Custom…" },
];

function reminderPresetFor(task) {
  if (!task.remindAt) return "";
  if (!task.deadline) return "custom";
  const minutes = Math.round((task.deadline.getTime() - task.remindAt.getTime()) / 60000);
  return REMINDER_PRESETS.some((preset) => preset.id === String(minutes)) ? String(minutes) : "custom";
}

const label = "mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400";
const input = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:ring-blue-500/20";

/** Side panel with every task field. Edits are kept as a draft until Save. */
export default function TaskEditor({ task, onSave, onClose, onArchive, onRestore, onDelete, onToggleComplete }) {
  const [draft, setDraft] = useState(() => ({ ...task, subTasks: task.subTasks.map((st) => ({ ...st })) }));
  const [reminderPreset, setReminderPreset] = useState(() => reminderPresetFor(task));
  const [newSubTask, setNewSubTask] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);
  const dragIndex = useRef(null);

  useEffect(() => { titleRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (patch) => setDraft((current) => ({ ...current, ...patch }));

  const computeRemindAt = () => {
    if (reminderPreset === "") return null;
    if (reminderPreset === "custom") return draft.remindAt;
    if (!draft.deadline) return null;
    return new Date(draft.deadline.getTime() - Number(reminderPreset) * 60000);
  };

  const save = async (event) => {
    event?.preventDefault();
    if (!draft.title.trim()) { titleRef.current?.focus(); return; }
    setSaving(true);
    const patch = {
      title: draft.title.trim(),
      notes: draft.notes,
      subTasks: draft.subTasks.filter((st) => st.label.trim()),
      isUrgent: draft.isUrgent,
      isImportant: draft.isImportant,
      deadline: draft.deadline,
      remindAt: computeRemindAt(),
      recurrence: draft.recurrence,
      color: draft.color,
      tags: draft.tags,
    };
    const saved = await onSave(task.id, patch);
    setSaving(false);
    if (saved) onClose();
  };

  const addSubTask = () => {
    const text = newSubTask.trim();
    if (!text) return;
    set({ subTasks: [...draft.subTasks, { id: newSubTaskId(), label: text, done: false }] });
    setNewSubTask("");
  };

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, "").toLowerCase();
    if (tag && !draft.tags.includes(tag)) set({ tags: [...draft.tags, tag] });
    setTagInput("");
  };

  const moveSubTask = (from, to) => {
    if (from == null || from === to) return;
    const next = [...draft.subTasks];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    set({ subTasks: next });
  };

  const currentQuadrant = quadrantOf(draft);

  return (
    <div className="fixed inset-0 z-[140] flex justify-end bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Edit task"
        className="flex h-full w-full max-w-[460px] flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0e1532]"
      >
        <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-3 dark:border-white/10">
          <button type="button" onClick={() => onToggleComplete(task.id)} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold ${task.completedAt ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"}`}>
            <Check className="h-3.5 w-3.5" /> {task.completedAt ? "Completed" : "Mark complete"}
          </button>
          <div className="flex items-center gap-1">
            {task.archivedAt ? (
              <>
                <button type="button" onClick={() => { onRestore(task.id); onClose(); }} title="Restore" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"><ArchiveRestore className="h-4 w-4" /></button>
                <button type="button" onClick={() => onDelete(task.id)} title="Delete permanently" className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"><Trash2 className="h-4 w-4" /></button>
              </>
            ) : (
              <button type="button" onClick={() => { onArchive(task.id); onClose(); }} title="Archive" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"><Archive className="h-4 w-4" /></button>
            )}
            <button type="button" onClick={onClose} title="Close (Esc)" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"><X className="h-4 w-4" /></button>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <input ref={titleRef} value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="Task title" aria-label="Title" className="w-full bg-transparent text-xl font-bold text-slate-900 outline-none placeholder:text-slate-300 dark:text-white" />

          <div>
            <span className={label}>Priority</span>
            <div className="grid grid-cols-2 gap-2">
              {QUADRANTS.map((quadrant) => (
                <button key={quadrant.id} type="button" onClick={() => set(flagsForQuadrant(quadrant.id))} aria-pressed={currentQuadrant === quadrant.id} className={`rounded-xl border px-3 py-2 text-left transition-colors ${currentQuadrant === quadrant.id ? "border-blue-500 bg-blue-50 dark:bg-blue-500/15" : "border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"}`}>
                  <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">{quadrant.label}</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">{quadrant.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 sm:col-span-1">
              <span className={label}><Calendar className="mr-1 inline h-3 w-3" />Due</span>
              <input type="datetime-local" className={input} value={toLocalInput(draft.deadline)} onChange={(e) => set({ deadline: fromLocalInput(e.target.value) })} />
            </label>
            <label className="col-span-2 sm:col-span-1">
              <span className={label}><Repeat className="mr-1 inline h-3 w-3" />Repeat</span>
              <select className={input} value={draft.recurrence} onChange={(e) => set({ recurrence: e.target.value })} disabled={!draft.deadline} title={draft.deadline ? undefined : "Set a due date to repeat"}>
                {RECURRENCE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="col-span-2 sm:col-span-1">
              <span className={label}><Bell className="mr-1 inline h-3 w-3" />Reminder</span>
              <select className={input} value={reminderPreset} onChange={(e) => setReminderPreset(e.target.value)}>
                {REMINDER_PRESETS.map((preset) => <option key={preset.id} value={preset.id} disabled={!draft.deadline && preset.id !== "" && preset.id !== "custom"}>{preset.label}</option>)}
              </select>
            </label>
            {reminderPreset === "custom" && (
              <label className="col-span-2 sm:col-span-1">
                <span className={label}>Remind at</span>
                <input type="datetime-local" className={input} value={toLocalInput(draft.remindAt)} onChange={(e) => set({ remindAt: fromLocalInput(e.target.value) })} />
              </label>
            )}
          </div>

          <label className="block">
            <span className={label}>Notes</span>
            <textarea rows={4} className={`${input} resize-y`} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Details, links, context…" />
          </label>

          <div>
            <span className={label}>Subtasks</span>
            <ul className="space-y-1">
              {draft.subTasks.map((st, index) => (
                <li
                  key={st.id}
                  draggable
                  onDragStart={() => { dragIndex.current = index; }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { moveSubTask(dragIndex.current, index); dragIndex.current = null; }}
                  className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <GripVertical className="h-3.5 w-3.5 cursor-grab text-slate-300" />
                  <input type="checkbox" checked={st.done} onChange={() => set({ subTasks: draft.subTasks.map((item) => item.id === st.id ? { ...item, done: !item.done } : item) })} className="accent-blue-600" aria-label={`Complete ${st.label}`} />
                  <input value={st.label} onChange={(e) => set({ subTasks: draft.subTasks.map((item) => item.id === st.id ? { ...item, label: e.target.value } : item) })} className={`flex-1 bg-transparent text-sm outline-none ${st.done ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-200"}`} />
                  <button type="button" onClick={() => set({ subTasks: draft.subTasks.filter((item) => item.id !== st.id) })} className="rounded p-1 text-slate-400 opacity-0 hover:text-red-500 group-hover:opacity-100" aria-label={`Remove ${st.label}`}><X className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <input value={newSubTask} onChange={(e) => setNewSubTask(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubTask(); } }} placeholder="Add a subtask and press Enter" className={input} />
              <button type="button" onClick={addSubTask} disabled={!newSubTask.trim()} className="rounded-xl bg-slate-100 px-3 text-slate-600 hover:bg-slate-200 disabled:opacity-40 dark:bg-white/10 dark:text-slate-200" aria-label="Add subtask"><Plus className="h-4 w-4" /></button>
            </div>
          </div>

          <div>
            <span className={label}>Tags</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {draft.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                  #{tag}
                  <button type="button" onClick={() => set({ tags: draft.tags.filter((item) => item !== tag) })} aria-label={`Remove tag ${tag}`}><X className="h-3 w-3" /></button>
                </span>
              ))}
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }} onBlur={addTag} placeholder="Add tag" className="min-w-[100px] flex-1 bg-transparent px-1 py-1 text-sm outline-none dark:text-slate-100" />
            </div>
          </div>

          <div>
            <span className={label}>Colour</span>
            <div className="flex flex-wrap gap-2">
              {STICKER_COLORS.map((color) => (
                <button key={color.id} type="button" onClick={() => set({ color: color.id })} aria-label={color.label} title={color.label} className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${draft.color === color.id ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#0e1532]" : ""}`} style={{ backgroundColor: color.hex, borderColor: color.id === "white" ? "#cbd5e1" : "rgba(0,0,0,0.12)" }} />
              ))}
            </div>
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-white/10">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
        </footer>
      </form>
    </div>
  );
}
