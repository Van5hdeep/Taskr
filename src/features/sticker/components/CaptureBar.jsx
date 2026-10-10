import { useMemo, useRef, useState } from "react";
import { Calendar, CornerDownLeft, Flame, Loader2, Plus, Star, X } from "lucide-react";
import { parseCapture } from "../logic";
import { formatDue } from "../format";

/**
 * One-line capture. Markers: "!" urgent, "*" important, "#tag", and natural
 * dates ("tomorrow 6pm", "fri", "in 3 days"). Parsed parts appear as chips.
 */
export default function CaptureBar({ onCreate, defaultFlags = null }) {
  const [text, setText] = useState("");
  const [overrides, setOverrides] = useState({ isUrgent: null, isImportant: null, dropDate: false });
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const parsed = useMemo(() => parseCapture(text, new Date()), [text]);
  const isUrgent = overrides.isUrgent ?? (parsed.isUrgent || Boolean(defaultFlags?.isUrgent));
  const isImportant = overrides.isImportant ?? (parsed.isImportant || Boolean(defaultFlags?.isImportant));
  const deadline = overrides.dropDate ? null : parsed.deadline;
  const title = overrides.dropDate && parsed.dateText ? `${parsed.title} ${parsed.dateText}`.trim() : parsed.title;

  const reset = () => {
    setText("");
    setOverrides({ isUrgent: null, isImportant: null, dropDate: false });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!title || busy) return;
    setBusy(true);
    try {
      await onCreate({ title, isUrgent, isImportant, deadline, tags: parsed.tags });
      reset();
      inputRef.current?.focus();
    } catch { /* the hook shows a toast */ } finally {
      setBusy(false);
    }
  };

  const chip = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors";

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100 dark:border-white/10 dark:bg-[#121a3a] dark:focus-within:ring-blue-500/20">
      <div className="flex items-center gap-2">
        <Plus className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
        <input
          ref={inputRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Escape") reset(); }}
          placeholder="Capture a task… try “Call bank tomorrow 5pm ! #finance”"
          aria-label="Capture a task"
          className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
        />
        <button type="submit" disabled={!title || busy} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-40">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CornerDownLeft className="h-3.5 w-3.5" />} Add
        </button>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 px-2 pb-1">
        <button type="button" onClick={() => setOverrides((o) => ({ ...o, isUrgent: !isUrgent }))} aria-pressed={isUrgent} className={`${chip} ${isUrgent ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"}`}>
          <Flame className="h-3 w-3" /> Urgent
        </button>
        <button type="button" onClick={() => setOverrides((o) => ({ ...o, isImportant: !isImportant }))} aria-pressed={isImportant} className={`${chip} ${isImportant ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"}`}>
          <Star className="h-3 w-3" /> Important
        </button>
        {deadline && (
          <span className={`${chip} bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300`}>
            <Calendar className="h-3 w-3" /> {formatDue(deadline)}
            <button type="button" onClick={() => setOverrides((o) => ({ ...o, dropDate: true }))} aria-label="Remove date" className="-mr-1 rounded-full p-0.5 hover:bg-blue-100 dark:hover:bg-blue-500/20"><X className="h-3 w-3" /></button>
          </span>
        )}
        {parsed.tags.map((tag) => <span key={tag} className={`${chip} bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300`}>#{tag}</span>)}
        {!text && <span className="text-[11px] text-slate-400">! urgent · * important · #tag · dates like “fri 6pm”</span>}
      </div>
    </form>
  );
}
