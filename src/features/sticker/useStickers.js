import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatSupabaseError } from "../../lib/supabase";
import * as api from "./api";
import { DONE_TTL_MS, urgencyFields } from "./constants";

/**
 * The one sticker board. Open stickers plus stickers checked off in the last
 * 24 hours (the Done board); older done stickers are cleared on load.
 * Mutations are optimistic and roll back with a toast if Supabase refuses.
 */
export function useStickers() {
  const [boardId, setBoardId] = useState(null);
  const [stickers, setStickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const ref = useRef(stickers);
  ref.current = stickers;

  useEffect(() => {
    let active = true;
    const cutoff = new Date(Date.now() - DONE_TTL_MS);
    Promise.all([api.listBoardsEnsuringDefault(), api.purgeDoneBefore(cutoff).catch(() => {})])
      .then(async ([boards]) => {
        const rows = await api.listStickers(cutoff);
        if (!active) return;
        setBoardId(boards[0]?.id ?? null);
        setStickers(rows);
      })
      .catch((err) => { if (active) setError(formatSupabaseError(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const replace = (id, next) => setStickers((list) => list.map((item) => (item.id === id ? next : item)));

  const add = useCallback(async ({ title, urgency, deadline = null }) => {
    if (!boardId || !title.trim()) return null;
    try {
      const created = await api.createTask(boardId, { title: title.trim(), deadline, ...urgencyFields(urgency) });
      setStickers((list) => [...list, created]);
      return created;
    } catch (err) {
      toast.error(formatSupabaseError(err, "Couldn't add the sticker."));
      return null;
    }
  }, [boardId]);

  const update = useCallback(async (id, patch) => {
    const previous = ref.current.find((item) => item.id === id);
    if (!previous) return null;
    replace(id, { ...previous, ...patch });
    try {
      return await api.updateTask(id, patch);
    } catch (err) {
      replace(id, previous);
      toast.error(formatSupabaseError(err, "Couldn't save the change."));
      return null;
    }
  }, []);

  const remove = useCallback(async (id) => {
    const previous = ref.current;
    setStickers((list) => list.filter((item) => item.id !== id));
    try {
      await api.deleteTask(id);
    } catch (err) {
      setStickers(previous);
      toast.error(formatSupabaseError(err, "Couldn't delete the sticker."));
    }
  }, []);

  const checkOff = useCallback(async (id) => {
    const sticker = ref.current.find((item) => item.id === id);
    if (!(await update(id, { completedAt: new Date() }))) return;
    toast.success(`Done: "${sticker?.title}" — moved to the Done board`, {
      action: { label: "Undo", onClick: () => update(id, { completedAt: null }) },
    });
  }, [update]);

  const putBack = useCallback((id) => update(id, { completedAt: null }), [update]);

  return { stickers, loading, error, add, update, remove, checkOff, putBack };
}
