import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatSupabaseError } from "../../lib/supabase";
import * as api from "./api";
import { nextOccurrence } from "./logic";

/**
 * Tasks of one board with optimistic updates. Every mutation updates local
 * state first and rolls back (with a toast) if Supabase rejects it.
 */
export function useBoardTasks(boardId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  useEffect(() => {
    if (!boardId) return undefined;
    let active = true;
    setLoading(true);
    setError(null);
    api.listTasks(boardId)
      .then((rows) => { if (active) setTasks(rows); })
      .catch((err) => { if (active) setError(formatSupabaseError(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [boardId]);

  const replace = (id, next) => setTasks((list) => list.map((task) => (task.id === id ? next : task)));

  const create = useCallback(async (fields) => {
    try {
      const created = await api.createTask(boardId, fields);
      setTasks((list) => [created, ...list]);
      return created;
    } catch (err) {
      toast.error(formatSupabaseError(err, "Couldn't create the task."));
      throw err;
    }
  }, [boardId]);

  /** Optimistic patch. Returns the saved task, or null after a rollback. */
  const update = useCallback(async (id, patch) => {
    const previous = tasksRef.current.find((task) => task.id === id);
    if (!previous) return null;
    replace(id, { ...previous, ...patch });
    try {
      const saved = await api.updateTask(id, patch);
      // Keep any newer local edits to other fields; adopt server timestamps.
      setTasks((list) => list.map((task) => (task.id === id ? { ...task, updatedAt: saved.updatedAt } : task)));
      return saved;
    } catch (err) {
      replace(id, previous);
      toast.error(formatSupabaseError(err, "Couldn't save the change."));
      return null;
    }
  }, []);

  const remove = useCallback(async (id) => {
    const previous = tasksRef.current;
    setTasks((list) => list.filter((task) => task.id !== id));
    try {
      await api.deleteTask(id);
    } catch (err) {
      setTasks(previous);
      toast.error(formatSupabaseError(err, "Couldn't delete the task."));
    }
  }, []);

  const archive = useCallback(async (id) => {
    const task = tasksRef.current.find((item) => item.id === id);
    const saved = await update(id, { archivedAt: new Date() });
    if (saved) {
      toast(`Archived "${task?.title ?? "task"}"`, {
        action: { label: "Undo", onClick: () => update(id, { archivedAt: null }) },
      });
    }
  }, [update]);

  const restore = useCallback((id) => update(id, { archivedAt: null }), [update]);

  /** Completes (or reopens) a task. Recurring tasks spawn their next occurrence. */
  const toggleComplete = useCallback(async (id) => {
    const task = tasksRef.current.find((item) => item.id === id);
    if (!task) return;

    if (task.completedAt) {
      await update(id, { completedAt: null });
      return;
    }

    const saved = await update(id, { completedAt: new Date() });
    if (!saved) return;

    let spawned = null;
    const nextDeadline = task.recurrence && task.deadline ? nextOccurrence(task.deadline, task.recurrence) : null;
    if (nextDeadline) {
      const offset = task.remindAt && task.deadline ? task.deadline.getTime() - task.remindAt.getTime() : null;
      try {
        spawned = await create({
          title: task.title,
          notes: task.notes,
          subTasks: task.subTasks.map((st) => ({ ...st, done: false })),
          isUrgent: task.isUrgent,
          isImportant: task.isImportant,
          deadline: nextDeadline,
          remindAt: offset != null ? new Date(nextDeadline.getTime() - offset) : null,
          recurrence: task.recurrence,
          color: task.color,
          tags: task.tags,
        });
      } catch { /* create() already reported the error */ }
    }

    toast.success(spawned ? `Done — next one scheduled for ${nextDeadline.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}` : `Done: "${task.title}"`, {
      action: {
        label: "Undo",
        onClick: async () => {
          await update(id, { completedAt: null });
          if (spawned) await remove(spawned.id);
        },
      },
    });
  }, [create, remove, update]);

  /** Toggling the last open subtask completes the task. */
  const toggleSubTask = useCallback(async (id, subTaskId) => {
    const task = tasksRef.current.find((item) => item.id === id);
    if (!task) return;
    const subTasks = task.subTasks.map((st) => (st.id === subTaskId ? { ...st, done: !st.done } : st));
    const saved = await update(id, { subTasks });
    if (saved && !task.completedAt && subTasks.length && subTasks.every((st) => st.done)) {
      await toggleComplete(id);
    }
  }, [toggleComplete, update]);

  return { tasks, loading, error, create, update, remove, archive, restore, toggleComplete, toggleSubTask };
}
