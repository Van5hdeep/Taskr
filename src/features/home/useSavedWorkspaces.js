import { useCallback, useEffect, useState } from "react";

// Interim "continue where you left off" list (localStorage). Phase 6 replaces
// it with recent items read from each tool's updated_at.
const KEY = "taskr_saved_workspaces";
const EVENT = "taskr:saved-workspaces";

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function useSavedWorkspaces() {
  const [savedWorkspaces, setSavedWorkspaces] = useState(read);

  useEffect(() => {
    const sync = () => setSavedWorkspaces(read());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  const saveWorkspace = useCallback((id, name, type) => {
    const previous = read();
    const updatedAt = Date.now();
    const entry = { id, name, type, lastUpdated: "just now", updatedAt };
    const next = previous.some((ws) => ws.id === id)
      ? previous.map((ws) => (ws.id === id ? { ...ws, ...entry } : ws))
      : [...previous, entry];
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage full */ }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { savedWorkspaces, saveWorkspace };
}
