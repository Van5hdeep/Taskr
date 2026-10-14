import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { AlertTriangle, ArrowLeft, Loader2, RotateCcw, Trash2 } from "../../lib/icons";
import { toast } from "sonner";
import SaveStatus from "../../components/ui/SaveStatus";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import { LinkedItemsButton } from "../links/LinkedItems";
import { formatSupabaseError } from "../../lib/supabase";
import { readCrashBuffer, useAutosave } from "../../lib/useAutosave";
import { useDocumentHistory } from "../workspace/useDocumentHistory";
import * as api from "./api";
import { migrateFlow } from "./model";
import FlowEditor from "./editor/FlowEditor";

function LoadedFlow({ row }) {
  const bufferKey = `taskr_unsaved_flow_${row.id}`;
  const history = useDocumentHistory(migrateFlow(row.scene));
  const [title, setTitle] = useState(row.title);
  const titleRef = useRef(title);
  titleRef.current = title;
  const [viewport, setViewport] = useState(row.viewport ?? null);
  const updatedAt = useRef(row.updated_at);
  const [recovery, setRecovery] = useState(() => {
    const buffer = readCrashBuffer(bufferKey);
    return buffer && buffer.at > new Date(row.updated_at).getTime() ? buffer : null;
  });

  const value = useMemo(() => ({ title, scene: history.content, viewport }), [title, history.content, viewport]);

  const save = useCallback(async (snapshot, options) => {
    const result = await api.saveFlow(row.id, { title: snapshot.title.trim() || "Untitled flow", scene: snapshot.scene, viewport: snapshot.viewport, diagram_type: snapshot.scene.diagramType ?? "blank" }, updatedAt.current, options);
    if (!result.conflict) {
      updatedAt.current = result.updated_at;
      if (snapshot.title.trim() && result.title !== snapshot.title.trim() && titleRef.current === snapshot.title) setTitle(result.title);
    }
    return result;
  }, [row.id]);

  const navigate = useNavigate();
  const confirm = useConfirm();
  const [deleting, setDeleting] = useState(false);
  const autosave = useAutosave({ value, save, bufferKey, delay: 800, enabled: !recovery && !deleting });

  const deleteDiagram = async () => {
    if (!(await confirm({ title: `Delete "${title || "Untitled flow"}"?`, message: "The diagram is permanently removed. This can't be undone.", confirmText: "Delete", destructive: true }))) return;
    // Stop autosave (including its flush on leaving) so nothing writes to the deleted row.
    setDeleting(true);
    autosave.markSaved(value);
    try {
      await api.deleteFlow(row.id);
      try { localStorage.removeItem(bufferKey); } catch { /* ignore */ }
      toast.success("Diagram deleted");
      navigate("/flow", { replace: true });
    } catch (err) {
      setDeleting(false);
      toast.error(formatSupabaseError(err));
    }
  };

  const loadLatest = async () => {
    try {
      const latest = await api.getFlow(row.id);
      updatedAt.current = latest.updated_at;
      const scene = migrateFlow(latest.scene);
      history.reset(scene);
      setTitle(latest.title);
      autosave.resolveConflict({ title: latest.title, scene, viewport });
    } catch (err) { toast.error(formatSupabaseError(err)); }
  };

  const keepMine = async () => {
    try {
      await save(value, { force: true });
      autosave.resolveConflict(value);
      toast.success("Your version was saved");
    } catch (err) { toast.error(formatSupabaseError(err)); }
  };

  useEffect(() => { document.title = `${title || "Untitled flow"} · taskr`; return () => { document.title = "taskr"; }; }, [title]);

  return (
    <div className="flex h-[calc(100vh-56px)] min-h-0 flex-col lg:h-screen">
      <header className="flex flex-none items-center gap-3 border-b border-stone-200 bg-white px-4 py-2.5">
        <Link to="/flow" className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800" aria-label="All diagrams" title="All diagrams"><ArrowLeft className="h-4 w-4" /></Link>
        <input value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} aria-label="Diagram title" placeholder="Untitled flow" className="min-w-0 flex-1 rounded-md bg-transparent px-1 text-lg font-bold text-stone-900 outline-none hover:bg-stone-50 focus:bg-stone-50 focus:ring-2 focus:ring-amber-200" />
        <LinkedItemsButton type="flow" id={row.id} />
        <SaveStatus status={autosave.status} />
        <button type="button" onClick={deleteDiagram} disabled={deleting} className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50" aria-label="Delete diagram" title="Delete diagram">
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </header>
      {autosave.status === "conflict" && (
        <div className="flex flex-none flex-wrap items-center gap-3 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4" />
          <span className="flex-1">This diagram was changed in another tab or device. Autosave is paused.</span>
          <button type="button" onClick={loadLatest} className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-100">Load latest</button>
          <button type="button" onClick={keepMine} className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700">Keep mine</button>
        </div>
      )}
      {recovery && (
        <div className="flex flex-none flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <RotateCcw className="h-4 w-4" />
          <span className="flex-1">Unsaved changes from {new Date(recovery.at).toLocaleString()} were found in this browser.</span>
          <button type="button" onClick={() => { history.reset(migrateFlow(recovery.value.scene)); setTitle(recovery.value.title); setRecovery(null); }} className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-700">Restore them</button>
          <button type="button" onClick={() => { try { localStorage.removeItem(bufferKey); } catch { /* ignore */ } setRecovery(null); }} className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">Discard</button>
        </div>
      )}
      <FlowEditor
        scene={history.content}
        commit={history.commit}
        undo={history.undo}
        redo={history.redo}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        title={title}
        viewport={row.viewport ?? null}
        onViewportChange={setViewport}
      />
    </div>
  );
}

export default function FlowEditorPage() {
  const { flowId } = useParams();
  const [row, setRow] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setRow(null);
    setError(null);
    api.getFlow(flowId)
      .then((data) => { if (active) { if (data) setRow(data); else setError("This diagram doesn't exist or was deleted."); } })
      .catch((err) => { if (active) setError(formatSupabaseError(err)); });
    return () => { active = false; };
  }, [flowId]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-stone-600 dark:text-stone-300">{error}</p>
        <Link to="/flow" className="text-sm font-semibold text-amber-700 hover:underline">Back to diagrams</Link>
      </div>
    );
  }
  if (!row) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;
  return <LoadedFlow key={row.id} row={row} />;
}
