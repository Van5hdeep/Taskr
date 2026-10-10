import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Debounced autosave with a localStorage crash buffer.
 *
 *   const { status, flush } = useAutosave({ value, save, bufferKey, delay })
 *
 * - `save(value)` returns a promise; resolve with { conflict: true } to pause
 *   autosave until `resolveConflict` is called.
 * - Unsaved values are mirrored to localStorage under `bufferKey` and removed
 *   once saved, so a crash or closed tab can be recovered.
 * status: "saved" | "pending" | "saving" | "offline" | "error" | "conflict"
 */
export function useAutosave({ value, save, bufferKey, delay = 800, enabled = true }) {
  const [status, setStatus] = useState("saved");
  const latest = useRef(value);
  const lastSaved = useRef(JSON.stringify(value));
  const saveRef = useRef(save);
  const timer = useRef(null);
  const inFlight = useRef(null);
  const paused = useRef(false);
  saveRef.current = save;
  latest.current = value;

  const run = useCallback(async () => {
    clearTimeout(timer.current);
    if (paused.current) return;
    const snapshot = latest.current;
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastSaved.current) { setStatus("saved"); return; }
    if (inFlight.current) { await inFlight.current; return run(); }
    if (typeof navigator !== "undefined" && navigator.onLine === false) { setStatus("offline"); return; }
    setStatus("saving");
    inFlight.current = (async () => {
      try {
        const result = await saveRef.current(snapshot);
        if (result?.conflict) {
          paused.current = true;
          setStatus("conflict");
          return;
        }
        lastSaved.current = serialized;
        if (JSON.stringify(latest.current) === serialized) {
          setStatus("saved");
          try { localStorage.removeItem(bufferKey); } catch { /* ignore */ }
        } else {
          setStatus("pending");
        }
      } catch {
        setStatus(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "error");
      } finally {
        inFlight.current = null;
      }
    })();
    await inFlight.current;
    if (!paused.current && JSON.stringify(latest.current) !== lastSaved.current) timer.current = setTimeout(run, delay);
  }, [bufferKey, delay]);

  useEffect(() => {
    if (!enabled) return undefined;
    const serialized = JSON.stringify(value);
    if (serialized === lastSaved.current) return undefined;
    if (!paused.current) setStatus("pending");
    try { localStorage.setItem(bufferKey, JSON.stringify({ at: Date.now(), value })); } catch { /* storage full */ }
    clearTimeout(timer.current);
    timer.current = setTimeout(run, delay);
    return undefined;
  }, [value, enabled, bufferKey, delay, run]);

  // Retry when the connection returns; flush when the tab is hidden or closed.
  useEffect(() => {
    const onOnline = () => run();
    const onHide = () => { if (document.visibilityState === "hidden") run(); };
    const onUnload = (event) => {
      if (JSON.stringify(latest.current) !== lastSaved.current) { run(); event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [run]);

  useEffect(() => () => { clearTimeout(timer.current); if (!paused.current) run(); }, [run]);

  /** Call after the user chooses how to resolve a conflict. */
  const resolveConflict = useCallback((acceptedValue) => {
    paused.current = false;
    if (acceptedValue !== undefined) lastSaved.current = JSON.stringify(acceptedValue);
    setStatus("saved");
  }, []);

  /** Mark a value as already persisted (e.g. right after loading). */
  const markSaved = useCallback((savedValue) => {
    lastSaved.current = JSON.stringify(savedValue);
    setStatus("saved");
  }, []);

  return { status, flush: run, resolveConflict, markSaved };
}

export function readCrashBuffer(bufferKey) {
  try { return JSON.parse(localStorage.getItem(bufferKey) || "null"); } catch { return null; }
}
