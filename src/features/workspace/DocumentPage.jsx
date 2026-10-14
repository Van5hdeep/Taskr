import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { AlertTriangle, ArrowLeft, Loader2, RotateCcw } from "../../lib/icons";
import SaveStatus from "../../components/ui/SaveStatus";
import { LinkedItemsButton } from "../links/LinkedItems";
import { toast } from "sonner";
import { formatSupabaseError } from "../../lib/supabase";
import { readCrashBuffer, useAutosave } from "../../lib/useAutosave";
import * as api from "./api";
import { migrateDocument } from "./model";
import { useDocumentHistory } from "./useDocumentHistory";
import DocumentEditor from "./editor/DocumentEditor";

function LoadedDocument({ row }) {
  const navigate = useNavigate();
  const bufferKey = `taskr_unsaved_document_${row.id}`;
  const history = useDocumentHistory(migrateDocument(row.content));
  const [title, setTitle] = useState(row.title);
  const titleRef = useRef(title);
  titleRef.current = title;
  const [pageStyle, setPageStyle] = useState(row.page_style ?? "plain");
  const updatedAt = useRef(row.updated_at);
  const [recovery, setRecovery] = useState(() => {
    const buffer = readCrashBuffer(bufferKey);
    return buffer && buffer.at > new Date(row.updated_at).getTime() ? buffer : null;
  });

  // Stable identity: autosave only reacts to real changes, not re-renders.
  const value = useMemo(() => ({ title, content: history.content, page_style: pageStyle }), [title, history.content, pageStyle]);

  const save = useCallback(async (snapshot, options) => {
    const result = await api.saveDocument(row.id, { title: snapshot.title.trim() || "Untitled document", content: snapshot.content, page_style: snapshot.page_style }, updatedAt.current, options);
    if (!result.conflict) {
      updatedAt.current = result.updated_at;
      // The name was taken: show the numbered one, unless the user has typed on since.
      if (snapshot.title.trim() && result.title !== snapshot.title.trim() && titleRef.current === snapshot.title) setTitle(result.title);
    }
    return result;
  }, [row.id]);

  const autosave = useAutosave({ value, save, bufferKey, delay: 800, enabled: !recovery });

  const loadLatest = async () => {
    try {
      const latest = await api.getDocument(row.id);
      updatedAt.current = latest.updated_at;
      history.reset(migrateDocument(latest.content));
      setTitle(latest.title);
      setPageStyle(latest.page_style ?? "plain");
      autosave.resolveConflict({ title: latest.title, content: migrateDocument(latest.content), page_style: latest.page_style ?? "plain" });
    } catch (err) {
      toast.error(formatSupabaseError(err));
    }
  };

  const keepMine = async () => {
    try {
      await save(value, { force: true });
      autosave.resolveConflict(value);
      toast.success("Your version was saved");
    } catch (err) {
      toast.error(formatSupabaseError(err));
    }
  };

  useEffect(() => { document.title = `${title || "Untitled document"} · taskr`; return () => { document.title = "taskr"; }; }, [title]);

  return (
    <div className="flex h-[calc(100vh-56px)] min-h-0 flex-col lg:h-screen">
      <header className="flex flex-none items-center gap-3 border-b border-stone-200 bg-white px-4 py-2.5">
        <Link to="/workspace" className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800" aria-label="All documents" title="All documents"><ArrowLeft className="h-4 w-4" /></Link>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
          aria-label="Document title"
          placeholder="Untitled document"
          className="min-w-0 flex-1 rounded-md bg-transparent px-1 text-lg font-bold text-stone-900 outline-none hover:bg-stone-50 focus:bg-stone-50 focus:ring-2 focus:ring-amber-200"
        />
        <LinkedItemsButton type="document" id={row.id} />
        <SaveStatus status={autosave.status} />
      </header>

      {autosave.status === "conflict" && (
        <div className="flex flex-none flex-wrap items-center gap-3 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4" />
          <span className="flex-1">This document was changed in another tab or device. Autosave is paused.</span>
          <button type="button" onClick={loadLatest} className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-100">Load latest</button>
          <button type="button" onClick={keepMine} className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700">Keep mine</button>
        </div>
      )}
      {recovery && (
        <div className="flex flex-none flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <RotateCcw className="h-4 w-4" />
          <span className="flex-1">Unsaved changes from {new Date(recovery.at).toLocaleString()} were found in this browser.</span>
          <button type="button" onClick={() => { const saved = recovery.value; history.reset(migrateDocument(saved.content)); setTitle(saved.title); setPageStyle(saved.page_style ?? "plain"); setRecovery(null); }} className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-700">Restore them</button>
          <button type="button" onClick={() => { try { localStorage.removeItem(bufferKey); } catch { /* ignore */ } setRecovery(null); }} className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">Discard</button>
        </div>
      )}

      <DocumentEditor
        documentId={row.id}
        title={title}
        content={history.content}
        commit={history.commit}
        undo={history.undo}
        redo={history.redo}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        pageStyle={pageStyle}
        onPageStyleChange={setPageStyle}
        onClose={() => navigate("/workspace")}
      />
    </div>
  );
}

export default function DocumentPage() {
  const { docId } = useParams();
  const [row, setRow] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setRow(null);
    setError(null);
    api.getDocument(docId)
      .then((data) => { if (active) { if (data) setRow(data); else setError("This document doesn't exist or was deleted."); } })
      .catch((err) => { if (active) setError(formatSupabaseError(err)); });
    return () => { active = false; };
  }, [docId]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-stone-600 dark:text-stone-300">{error}</p>
        <Link to="/workspace" className="text-sm font-semibold text-amber-700 hover:underline">Back to documents</Link>
      </div>
    );
  }
  if (!row) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;
  return <LoadedDocument key={row.id} row={row} />;
}
