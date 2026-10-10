import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Archive, Bell, BellOff, Check, ChevronDown, ClipboardCheck, Loader2, Pencil, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../lib/auth/AuthProvider";
import { formatSupabaseError } from "../../lib/supabase";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import StatusBanner from "../../components/ui/StatusBanner";
import * as api from "./api";
import { DUE_FILTERS, STATUS_FILTERS, VIEWS } from "./constants";
import { collectTags, matchesFilters, reviewQueue } from "./logic";
import { useBoardTasks } from "./useBoardTasks";
import { useTaskReminders } from "./useTaskReminders";
import CaptureBar from "./components/CaptureBar";
import MatrixView from "./components/MatrixView";
import FreeBoardView from "./components/FreeBoardView";
import ListView from "./components/ListView";
import TaskEditor from "./components/TaskEditor";
import ReviewDialog from "./components/ReviewDialog";

function useNow(intervalMs) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function BoardSwitcher({ boards, board, onSelect, onCreate, onRename, onArchive }) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(board?.name ?? "");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => { setName(board?.name ?? ""); }, [board]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!event.target.closest("[data-board-switcher]")) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  if (renaming) {
    return (
      <form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); onRename(name); setRenaming(false); }}>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setRenaming(false); }} className="rounded-lg border border-blue-300 bg-white px-2 py-1 text-xl font-extrabold text-slate-900 outline-none ring-2 ring-blue-100 dark:bg-white/5 dark:text-white" aria-label="Board name" />
        <button type="submit" className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50" aria-label="Save name"><Check className="h-4 w-4" /></button>
      </form>
    );
  }

  return (
    <div className="relative flex items-center gap-1" data-board-switcher>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 text-2xl font-extrabold tracking-tight text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-white/5">
        {board?.name ?? "Board"} <ChevronDown className="h-5 w-5 text-slate-400" />
      </button>
      <button type="button" onClick={() => setRenaming(true)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5" aria-label="Rename board" title="Rename board"><Pencil className="h-4 w-4" /></button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#121a3a]">
          {boards.map((item) => (
            <button key={item.id} type="button" onClick={() => { onSelect(item.id); setOpen(false); }} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold ${item.id === board?.id ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"}`}>
              {item.name} {item.id === board?.id && <Check className="h-4 w-4" />}
            </button>
          ))}
          <div className="my-2 h-px bg-slate-100 dark:bg-white/10" />
          {creating ? (
            <form className="flex gap-2 p-1" onSubmit={(event) => { event.preventDefault(); if (newName.trim()) { onCreate(newName); setNewName(""); setCreating(false); setOpen(false); } }}>
              <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Board name" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
              <button type="submit" className="rounded-lg bg-blue-600 px-3 text-xs font-bold text-white">Create</button>
            </form>
          ) : (
            <button type="button" onClick={() => setCreating(true)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"><Plus className="h-4 w-4" /> New board</button>
          )}
          {boards.length > 1 && (
            <button type="button" onClick={() => { setOpen(false); onArchive(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"><Archive className="h-4 w-4" /> Archive this board</button>
          )}
        </div>
      )}
    </div>
  );
}

export default function StickerPage() {
  const { userId } = useAuth();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [boards, setBoards] = useState([]);
  const [boardsError, setBoardsError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [notifyPermission, setNotifyPermission] = useState(() => (typeof Notification === "undefined" ? "unsupported" : Notification.permission));

  useEffect(() => {
    let active = true;
    api.listBoardsEnsuringDefault()
      .then((rows) => { if (active) setBoards(rows); })
      .catch((err) => { if (active) setBoardsError(formatSupabaseError(err)); });
    return () => { active = false; };
  }, []);

  const board = boards.find((item) => item.id === params.get("board")) ?? boards[0] ?? null;
  const view = VIEWS.some((item) => item.id === params.get("view")) ? params.get("view") : board?.default_view ?? "matrix";
  const filters = {
    q: params.get("q") ?? "",
    tag: params.get("tag") ?? "",
    due: params.get("due") ?? "all",
    status: params.get("status") ?? "open",
  };

  const setParam = useCallback((key, value, fallback = "") => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (!value || value === fallback) next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  }, [setParams]);

  const { tasks, loading, error, create, update, remove, archive, restore, toggleComplete, toggleSubTask } = useBoardTasks(board?.id);
  useTaskReminders(tasks, userId);
  const now = useNow(view === "free" ? 1000 : 30_000);

  const visible = useMemo(() => tasks.filter((task) => matchesFilters(task, filters, now)), [tasks, filters.q, filters.tag, filters.due, filters.status, now]); // eslint-disable-line react-hooks/exhaustive-deps
  const tags = useMemo(() => collectTags(tasks), [tasks]);
  const reviewCount = useMemo(() => reviewQueue(tasks, now).length, [tasks, now]);
  const hasActiveFilters = Boolean(filters.q || filters.tag || filters.due !== "all" || filters.status !== "open");
  const editingTask = tasks.find((task) => task.id === editingId) ?? null;

  // Deep link (?task=<id>) from search, Home or a linked document opens its editor.
  const linkedTaskId = params.get("task");
  useEffect(() => {
    if (!linkedTaskId || loading) return;
    const task = tasks.find((item) => item.id === linkedTaskId);
    if (task) {
      setEditingId(task.id);
      if (task.completedAt) setParam("status", "done", "open");
      if (task.archivedAt) setParam("status", "archived", "open");
    }
    setParam("task", "");
  }, [linkedTaskId, loading, tasks, setParam]);

  const handleCreateBoard = async (name) => {
    try {
      const created = await api.createBoard({ name });
      setBoards((list) => [...list, created]);
      setParam("board", created.id);
    } catch (err) { toast.error(formatSupabaseError(err)); }
  };

  const handleRenameBoard = async (name) => {
    if (!board || !name.trim() || name.trim() === board.name) return;
    try {
      const saved = await api.updateBoard(board.id, { name: name.trim() });
      setBoards((list) => list.map((item) => (item.id === saved.id ? saved : item)));
    } catch (err) { toast.error(formatSupabaseError(err)); }
  };

  const handleArchiveBoard = async () => {
    if (!board) return;
    if (!(await confirm({ title: `Archive "${board.name}"?`, message: "The board and its tasks are hidden but kept.", confirmText: "Archive" }))) return;
    try {
      await api.archiveBoard(board.id);
      setBoards((list) => list.filter((item) => item.id !== board.id));
      setParam("board", "");
    } catch (err) { toast.error(formatSupabaseError(err)); }
  };

  const handleDelete = async (id) => {
    const task = tasks.find((item) => item.id === id);
    if (!(await confirm({ title: "Delete permanently?", message: `"${task?.title}" will be removed for good.`, destructive: true }))) return;
    setEditingId(null);
    await remove(id);
  };

  const handleCreate = async (fields) => {
    await create(fields);
    if (filters.status !== "open") setParam("status", "");
  };

  const requestNotifications = async () => {
    if (typeof Notification === "undefined") return;
    setNotifyPermission(await Notification.requestPermission());
  };

  const pill = (active) => `rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${active ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-white/10 dark:text-slate-300"}`;

  if (boardsError) {
    return <main className="mx-auto w-full max-w-3xl px-4 py-10"><StatusBanner message={boardsError} /></main>;
  }

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-6 pb-28 sm:px-6 lg:px-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {board ? (
          <BoardSwitcher boards={boards} board={board} onSelect={(id) => setParam("board", id)} onCreate={handleCreateBoard} onRename={handleRenameBoard} onArchive={handleArchiveBoard} />
        ) : <div className="h-9 w-40 animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />}
        <div className="flex flex-wrap items-center gap-2">
          {notifyPermission === "default" && (
            <button type="button" onClick={requestNotifications} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5" title="Get browser notifications for reminders">
              <Bell className="h-4 w-4" /> Enable reminders
            </button>
          )}
          {notifyPermission === "denied" && <span className="inline-flex items-center gap-1 text-xs text-slate-400" title="Notifications are blocked in your browser settings"><BellOff className="h-3.5 w-3.5" /> Notifications blocked</span>}
          <button type="button" onClick={() => setReviewOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-blue-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
            <ClipboardCheck className="h-4 w-4 text-blue-600" /> Daily review
            {reviewCount > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] text-white">{reviewCount}</span>}
          </button>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-white/5" role="radiogroup" aria-label="View">
            {VIEWS.map((item) => (
              <button key={item.id} type="button" role="radio" aria-checked={view === item.id} onClick={() => setParam("view", item.id, board?.default_view)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${view === item.id ? "bg-white text-blue-700 shadow-sm dark:bg-[#1c2650] dark:text-blue-300" : "text-slate-500 hover:text-slate-800 dark:text-slate-400"}`}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <CaptureBar onCreate={handleCreate} />

      <div className="my-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input value={filters.q} onChange={(e) => setParam("q", e.target.value)} placeholder="Search" aria-label="Search tasks" className="w-44 rounded-full border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100" />
        </div>
        {STATUS_FILTERS.map((item) => <button key={item.id} type="button" onClick={() => setParam("status", item.id, "open")} className={pill(filters.status === item.id)}>{item.label}</button>)}
        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" />
        {DUE_FILTERS.map((item) => <button key={item.id} type="button" onClick={() => setParam("due", item.id, "all")} className={pill(filters.due === item.id)}>{item.label}</button>)}
        {tags.length > 0 && <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" />}
        {tags.map((tag) => <button key={tag} type="button" onClick={() => setParam("tag", filters.tag === tag ? "" : tag)} className={pill(filters.tag === tag)}>#{tag}</button>)}
        {hasActiveFilters && (
          <button type="button" onClick={() => setParams(board ? { board: board.id, ...(params.get("view") ? { view } : {}) } : {}, { replace: true })} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><X className="h-3 w-3" /> Clear</button>
        )}
      </div>

      <StatusBanner message={error} />

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
      ) : view === "matrix" ? (
        <MatrixView tasks={visible} now={now} onOpen={setEditingId} onToggleComplete={toggleComplete} onMove={(id, flags) => update(id, flags)} />
      ) : view === "free" ? (
        <FreeBoardView tasks={visible} now={now} hasActiveFilters={hasActiveFilters} onOpen={setEditingId} onToggleComplete={toggleComplete} onToggleSubTask={toggleSubTask} onCommitLayout={(id, patch) => update(id, patch)} />
      ) : visible.length ? (
        <ListView tasks={visible} now={now} onOpen={setEditingId} onToggleComplete={toggleComplete} />
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-white/10">{hasActiveFilters ? "No tasks match these filters." : "Nothing here yet — capture your first task above."}</p>
      )}

      {editingTask && (
        <TaskEditor
          key={editingTask.id}
          task={editingTask}
          onSave={update}
          onClose={() => setEditingId(null)}
          onArchive={archive}
          onRestore={restore}
          onDelete={handleDelete}
          onToggleComplete={toggleComplete}
        />
      )}
      {reviewOpen && <ReviewDialog tasks={tasks} now={now} onClose={() => setReviewOpen(false)} onComplete={toggleComplete} onUpdate={update} />}
    </main>
  );
}
