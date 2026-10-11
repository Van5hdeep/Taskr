import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Check, CheckCircle2, Info, LayoutGrid, Loader2, Plus, RotateCcw, StickyNote, Trash2 } from "../../lib/icons";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import StatusBanner from "../../components/ui/StatusBanner";
import { DONE_TTL_MS, URGENCY, urgencyFields, urgencyMeta, urgencyOf } from "./constants";
import { formatDue } from "./format";
import { useFreeLayout } from "./useFreeLayout";
import { useStickers } from "./useStickers";

function useNow(intervalMs) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function UrgencyPicker({ value, onChange, size = "md" }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Urgency">
      {URGENCY.map((item) => (
        <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={value === item.id}
          title={`${item.label} — ${item.hint}`}
          onClick={() => onChange(item.id)}
          className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 transition-colors ${size === "sm" ? "p-1" : "px-2.5 py-1 text-xs"} ${value === item.id ? item.chip : "text-stone-500 ring-transparent hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-white/5"}`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
          {size !== "sm" && item.label}
        </button>
      ))}
    </div>
  );
}

function AddBar({ onAdd }) {
  const [title, setTitle] = useState("");
  const [urgency, setUrgency] = useState("blue");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    const created = await onAdd({ title, urgency, deadline: due ? new Date(`${due}T18:00`) : null });
    setBusy(false);
    if (created) { setTitle(""); setDue(""); }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm sm:flex-row sm:items-center dark:border-white/10 dark:bg-ink-850">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Write a sticker…"
        aria-label="New sticker"
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 dark:text-stone-100"
      />
      <div className="flex flex-wrap items-center gap-2 px-1">
        <UrgencyPicker value={urgency} onChange={setUrgency} />
        <input type="date" value={due} onChange={(event) => setDue(event.target.value)} aria-label="Due date (optional)" title="Due date (optional)" className="rounded-lg border border-stone-200 bg-transparent px-2 py-1 text-xs text-stone-600 outline-none dark:border-white/10 dark:text-stone-300 dark:[color-scheme:dark]" />
        <button type="submit" disabled={!title.trim() || busy} className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 dark:bg-amber-400 dark:text-stone-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-stone-800 dark:hover:bg-amber-300 disabled:opacity-40">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Stick it
        </button>
      </div>
    </form>
  );
}

function Sticker({ sticker, now, highlighted, onUpdate, onDelete, onCheckOff }) {
  const urgency = urgencyMeta(urgencyOf(sticker));
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(sticker.title);
  const overdue = sticker.deadline && sticker.deadline.getTime() < now;

  useEffect(() => { setText(sticker.title); }, [sticker.title]);

  const save = () => {
    setEditing(false);
    if (text.trim() && text.trim() !== sticker.title) onUpdate(sticker.id, { title: text.trim() });
    else setText(sticker.title);
  };

  return (
    <article className={`group relative flex h-full w-full flex-col rounded-xl border p-3.5 pt-4 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.18)] ${urgency.card} ${highlighted ? "ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-ink-950" : ""}`}>
      <span className={`absolute left-1/2 top-0 h-1.5 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full ${urgency.tape}`} aria-hidden />
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{urgency.label}</span>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100" data-no-drag>
          <UrgencyPicker size="sm" value={urgency.id} onChange={(id) => onUpdate(sticker.id, urgencyFields(id))} />
          <button type="button" onClick={() => onDelete(sticker)} className="rounded-md p-1 opacity-70 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10" aria-label={`Delete ${sticker.title}`} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {editing ? (
        <textarea
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); save(); }
            if (event.key === "Escape") { setText(sticker.title); setEditing(false); }
          }}
          className="w-full flex-1 resize-none bg-transparent text-[15px] font-semibold leading-snug outline-none"
        />
      ) : (
        <p onDoubleClick={() => setEditing(true)} className="line-clamp-4 flex-1 cursor-text whitespace-pre-wrap break-words text-[15px] font-semibold leading-snug" title="Double-click to edit">
          {sticker.title}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={`text-[11px] font-semibold ${overdue ? "text-red-600 dark:text-red-400" : "opacity-60"}`}>
          {sticker.deadline ? `${overdue ? "Overdue · " : "Due "}${formatDue(sticker.deadline, now)}` : ""}
        </span>
        <button type="button" onClick={() => onCheckOff(sticker.id)} className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-stone-700 shadow-sm ring-1 ring-black/5 hover:bg-emerald-500 hover:text-white dark:bg-white/10 dark:text-stone-100 dark:ring-white/10 dark:hover:bg-emerald-500">
          <Check className="h-3 w-3" strokeWidth={3} /> Done
        </button>
      </div>
    </article>
  );
}

function OpenBoard({ stickers, now, highlightId, onUpdate, onDelete, onCheckOff, arrangeRef }) {
  const canvasRef = useRef(null);
  const [width, setWidth] = useState(900);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const free = useFreeLayout(stickers, width, (id, patch) => onUpdate(id, patch));
  arrangeRef.current = free.arrange;

  useEffect(() => {
    if (highlightId) canvasRef.current?.querySelector(`[data-sticker="${highlightId}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlightId, free.layout]);

  return (
    <div
      ref={canvasRef}
      onClick={(event) => { if (event.target === event.currentTarget) free.deselect(); }}
      className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 [background-image:radial-gradient(#d4d4d8_1px,transparent_1px)] [background-size:20px_20px] dark:border-white/[0.07] dark:bg-ink-900 dark:[background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)]"
      style={{ minHeight: Math.max(560, free.maxBottom + 160) }}
    >
      {!stickers.length && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <StickyNote className="mb-3 h-10 w-10 text-stone-300 dark:text-stone-600" />
          <p className="text-sm font-bold text-stone-700 dark:text-stone-200">The board is clear</p>
          <p className="mt-1 max-w-xs text-sm text-stone-500 dark:text-stone-400">Write something above, pick how urgent it is, and stick it on.</p>
        </div>
      )}
      {stickers.map((sticker) => {
        const pos = free.layout[sticker.id];
        if (!pos) return null;
        const dragging = free.activeId === sticker.id && free.isDragging;
        return (
          <div
            key={sticker.id}
            data-sticker={sticker.id}
            className={`absolute ${dragging ? "cursor-grabbing" : "cursor-grab"} transition-shadow`}
            style={{ left: pos.x, top: pos.y, width: pos.w, height: pos.h, zIndex: dragging ? 9999 : pos.z || 1, touchAction: "none", transform: dragging ? "rotate(-1.5deg) scale(1.02)" : undefined }}
            onPointerDown={(event) => { if (!event.target.closest("textarea, [data-no-drag]")) free.startDrag(sticker.id, event); }}
          >
            <Sticker sticker={sticker} now={now} highlighted={highlightId === sticker.id} onUpdate={onUpdate} onDelete={onDelete} onCheckOff={onCheckOff} />
          </div>
        );
      })}
    </div>
  );
}

function DoneBoard({ stickers, now, onPutBack, onDelete }) {
  if (!stickers.length) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 px-6 text-center dark:border-white/10">
        <CheckCircle2 className="mb-3 h-10 w-10 text-stone-300 dark:text-stone-600" />
        <p className="text-sm font-bold text-stone-700 dark:text-stone-200">Nothing finished yet today</p>
        <p className="mt-1 max-w-xs text-sm text-stone-500 dark:text-stone-400">Stickers you check off land here and clear themselves after 24 hours.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 dark:border-white/[0.07] dark:bg-ink-900">
      {stickers.map((sticker) => {
        const urgency = urgencyMeta(urgencyOf(sticker));
        const hoursLeft = Math.max(1, Math.ceil((sticker.completedAt.getTime() + DONE_TTL_MS - now) / 3_600_000));
        return (
          <article key={sticker.id} className={`relative flex min-h-[140px] flex-col rounded-xl border p-3.5 pt-4 opacity-80 ${urgency.card}`}>
            <span className={`absolute left-1/2 top-0 h-1.5 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full ${urgency.tape} opacity-60`} aria-hidden />
            <span className="mb-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Done</span>
            <p className="flex-1 whitespace-pre-wrap break-words text-[15px] font-semibold leading-snug line-through decoration-2 opacity-70">{sticker.title}</p>
            <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
              <span className="opacity-60">Clears in {hoursLeft}h</span>
              <span className="flex gap-1">
                <button type="button" onClick={() => onPutBack(sticker.id)} className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 font-bold text-stone-700 ring-1 ring-black/5 hover:bg-white dark:bg-white/10 dark:text-stone-100 dark:ring-white/10" title="Move back to the board">
                  <RotateCcw className="h-3 w-3" /> Put back
                </button>
                <button type="button" onClick={() => onDelete(sticker)} className="rounded-full p-1.5 opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10" aria-label={`Delete ${sticker.title}`}><Trash2 className="h-3.5 w-3.5" /></button>
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function StickerPage() {
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const { stickers, loading, error, add, update, remove, checkOff, putBack } = useStickers();
  const now = useNow(60_000);
  const showDone = params.get("show") === "done";
  const [filter, setFilter] = useState("all");
  const [highlightId, setHighlightId] = useState(null);
  const arrangeRef = useRef(() => {});

  const open = useMemo(() => stickers.filter((item) => !item.completedAt), [stickers]);
  const done = useMemo(() => stickers.filter((item) => item.completedAt).sort((a, b) => b.completedAt - a.completedAt), [stickers]);
  const counts = useMemo(() => Object.fromEntries(URGENCY.map((item) => [item.id, open.filter((s) => urgencyOf(s) === item.id).length])), [open]);
  const visible = filter === "all" ? open : open.filter((item) => urgencyOf(item) === filter);

  // Deep link (?task=<id>) from Home or search: show and highlight that sticker.
  const linkedId = params.get("task");
  useEffect(() => {
    if (!linkedId || loading) return;
    const target = stickers.find((item) => item.id === linkedId);
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("task");
      next.delete("board");
      if (target?.completedAt) next.set("show", "done");
      return next;
    }, { replace: true });
    if (target) { setFilter("all"); setHighlightId(target.id); }
  }, [linkedId, loading, stickers, setParams]);

  useEffect(() => {
    if (!highlightId) return undefined;
    const timer = setTimeout(() => setHighlightId(null), 2500);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const setShowDone = (value) => setParams((current) => {
    const next = new URLSearchParams(current);
    if (value) next.set("show", "done"); else next.delete("show");
    return next;
  }, { replace: true });

  const handleDelete = async (sticker) => {
    if (!(await confirm({ title: "Delete this sticker?", message: `"${sticker.title}" will be removed for good.`, confirmText: "Delete", destructive: true }))) return;
    await remove(sticker.id);
  };

  const tidyUp = () => {
    const order = URGENCY.map((item) => item.id);
    arrangeRef.current([...open].sort((a, b) => order.indexOf(urgencyOf(a)) - order.indexOf(urgencyOf(b)) || a.createdAt - b.createdAt).map((item) => item.id));
  };

  const tab = (active) => `inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${active ? "bg-white text-stone-900 shadow-sm dark:bg-ink-800 dark:text-white" : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"}`;
  const countBadge = "rounded-full bg-stone-200/80 px-1.5 text-[11px] font-bold text-stone-600 dark:bg-white/10 dark:text-stone-300";

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-6 pb-28 sm:px-6 lg:px-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-brand text-2xl font-semibold tracking-[-0.03em] text-stone-900 dark:text-white">Sticker board</h1>
          <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">Colour shows urgency. Check a sticker off when it's done.</p>
        </div>
        <div className="inline-flex rounded-xl bg-stone-100 p-1 dark:bg-white/5" role="tablist" aria-label="Board">
          <button type="button" role="tab" aria-selected={!showDone} onClick={() => setShowDone(false)} className={tab(!showDone)}>Board <span className={countBadge}>{open.length}</span></button>
          <button type="button" role="tab" aria-selected={showDone} onClick={() => setShowDone(true)} className={tab(showDone)}>Done <span className={countBadge}>{done.length}</span></button>
        </div>
      </header>

      <StatusBanner message={error} />

      {!showDone && (
        <>
          <AddBar onAdd={add} />
          <div className="my-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setFilter("all")} className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${filter === "all" ? "bg-stone-900 text-white ring-stone-900 dark:bg-white dark:text-stone-900 dark:ring-white" : "text-stone-600 ring-stone-200 hover:ring-stone-300 dark:text-stone-300 dark:ring-white/10"}`}>All {open.length}</button>
            {URGENCY.map((item) => (
              <button key={item.id} type="button" onClick={() => setFilter(filter === item.id ? "all" : item.id)} title={item.hint} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${filter === item.id ? item.chip : "text-stone-600 ring-stone-200 hover:ring-stone-300 dark:text-stone-300 dark:ring-white/10"}`}>
                <span className={`h-2 w-2 rounded-full ${item.dot}`} /> {item.label} {counts[item.id]}
              </button>
            ))}
            <span className="ml-auto inline-flex items-center gap-3">
              <span className="hidden items-center gap-1 text-xs text-stone-400 md:inline-flex"><Info className="h-3.5 w-3.5" /> Drag to move · double-click to edit</span>
              {open.length > 1 && (
                <button type="button" onClick={tidyUp} title="Line stickers up, most urgent first" className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 dark:border-white/10 dark:text-stone-300 dark:hover:bg-white/5">
                  <LayoutGrid className="h-3.5 w-3.5" /> Tidy up
                </button>
              )}
            </span>
          </div>
        </>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>
      ) : showDone ? (
        <DoneBoard stickers={done} now={now} onPutBack={putBack} onDelete={handleDelete} />
      ) : (
        <OpenBoard stickers={visible} now={now} highlightId={highlightId} onUpdate={update} onDelete={handleDelete} onCheckOff={checkOff} arrangeRef={arrangeRef} />
      )}
    </main>
  );
}
