import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Archive, ArchiveRestore, Copy, FilePlus2, FileText, HardDriveDownload, Loader2, MoreHorizontal, Pencil, Pin, PinOff, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import Modal from "../../components/ui/Modal";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import StatusBanner from "../../components/ui/StatusBanner";
import { formatSupabaseError } from "../../lib/supabase";
import * as api from "./api";
import { migrateDocument, TEMPLATES } from "./model";

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function PageThumb({ style }) {
  const backgrounds = {
    plain: "none",
    lined: "repeating-linear-gradient(transparent 0 9px, #cbd5e1 9px 10px)",
    grid: "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
    dotted: "radial-gradient(#94a3b8 1px, transparent 1px)",
  };
  return <span className="block h-24 w-[68px] rounded-sm bg-white shadow ring-1 ring-slate-200" style={{ backgroundImage: backgrounds[style] ?? "none", backgroundSize: style === "grid" ? "10px 10px" : style === "dotted" ? "8px 8px" : undefined }} />;
}

// ─── Import of the single document the old version kept in this browser ───

function findLocalDocuments() {
  const found = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith("taskr_workspace_document_") || key.endsWith("_imported")) continue;
      const data = JSON.parse(localStorage.getItem(key) || "null");
      if (data && (data.blocks?.length || data.annotations?.length || data.ink?.length)) found.push({ key, data });
    }
  } catch { /* ignore unreadable entries */ }
  return found;
}

async function importLocalDocument({ key, data }) {
  const content = migrateDocument(data);
  const row = await api.createDocument({ title: data.title || "Imported document", content: { ...content, blocks: [] } });
  // Inline base64 images move to Storage so documents stay small.
  const blocks = [];
  for (const block of content.blocks) {
    if (block.type === "image" && block.src?.startsWith("data:")) {
      try {
        const path = await api.uploadImage(row.id, await api.dataUrlToFile(block.src));
        const { src, ...rest } = block;
        blocks.push({ ...rest, assetPath: path });
      } catch {
        blocks.push(block);
      }
    } else {
      blocks.push(block);
    }
  }
  await api.saveDocument(row.id, { content: { ...content, blocks } }, null, { force: true });
  localStorage.setItem(`${key}_imported`, localStorage.getItem(key));
  localStorage.removeItem(key);
  return row;
}

export default function DocumentsList() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyTemplate, setBusyTemplate] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [localDocs, setLocalDocs] = useState(() => findLocalDocuments());
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try { setDocuments(await api.listDocuments({ archived: showArchived })); } catch (err) { setError(formatSupabaseError(err)); }
  }, [showArchived]);

  useEffect(() => { setDocuments(null); load(); }, [load]);
  useEffect(() => {
    if (!menuId) return undefined;
    const close = (event) => { if (!event.target.closest("[data-doc-menu]")) setMenuId(null); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menuId]);

  const visible = useMemo(() => (documents ?? []).filter((doc) => doc.title.toLowerCase().includes(query.trim().toLowerCase())), [documents, query]);

  const create = async (template) => {
    setBusyTemplate(template.id);
    try {
      const row = await api.createDocument({ title: template.id === "blank" || template.id === "lined" ? "Untitled document" : template.label, content: template.build(), pageStyle: template.pageStyle });
      navigate(`/workspace/${row.id}`);
    } catch (err) {
      toast.error(formatSupabaseError(err));
      setBusyTemplate(null);
    }
  };

  const updateMeta = async (doc, patch) => {
    try {
      const saved = await api.updateDocumentMeta(doc.id, patch);
      setDocuments((list) => list.map((item) => (item.id === doc.id ? saved : item)));
      return saved;
    } catch (err) { toast.error(formatSupabaseError(err)); return null; }
  };

  const archive = async (doc) => {
    const saved = await updateMeta(doc, { archived_at: showArchived ? null : new Date().toISOString() });
    if (!saved) return;
    setDocuments((list) => list.filter((item) => item.id !== doc.id));
    if (!showArchived) toast(`Archived "${doc.title}"`, { action: { label: "Undo", onClick: async () => { await api.updateDocumentMeta(doc.id, { archived_at: null }); load(); } } });
  };

  const remove = async (doc) => {
    if (!(await confirm({ title: `Delete "${doc.title}" forever?`, message: "The document and its images are permanently removed.", destructive: true }))) return;
    try {
      await api.deleteDocument(doc.id);
      setDocuments((list) => list.filter((item) => item.id !== doc.id));
    } catch (err) { toast.error(formatSupabaseError(err)); }
  };

  const duplicate = async (doc) => {
    try {
      const copy = await api.duplicateDocument(doc.id);
      setDocuments((list) => [copy, ...list]);
      toast.success("Duplicated");
    } catch (err) { toast.error(formatSupabaseError(err)); }
  };

  const runImport = async () => {
    setImporting(true);
    try {
      for (const local of localDocs) await importLocalDocument(local);
      toast.success(`Imported ${localDocs.length} document${localDocs.length === 1 ? "" : "s"} from this browser`);
      setLocalDocs([]);
      load();
    } catch (err) {
      toast.error(formatSupabaseError(err, "Import failed."));
    } finally {
      setImporting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 pb-28 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Workspace</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">A4 notebooks: type, draw, add tables, shapes and images anywhere on the page.</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"><FilePlus2 className="h-4 w-4" /> New document</button>
      </header>

      {localDocs.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-500/30 dark:bg-blue-500/10">
          <HardDriveDownload className="h-5 w-5 text-blue-600" />
          <p className="flex-1 text-blue-900 dark:text-blue-100"><strong>A document from the earlier version</strong> is saved only in this browser. Import it so it syncs to your account?</p>
          <button type="button" onClick={runImport} disabled={importing} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Import</button>
          <button type="button" onClick={() => setLocalDocs([])} className="rounded-lg p-1.5 text-blue-700" aria-label="Not now"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documents" aria-label="Search documents" className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white" />
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} className="accent-blue-600" /> Archived</label>
      </div>

      <StatusBanner message={error} />

      {!documents && !error ? (
        <div className="flex min-h-[30vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
      ) : visible.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((doc) => (
            <article key={doc.id} className="group relative rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-white/10 dark:bg-[#0f1733]">
              <Link to={showArchived ? "#" : `/workspace/${doc.id}`} onClick={(event) => { if (showArchived) event.preventDefault(); }} className="block">
                <div className="mb-3 flex justify-center rounded-xl bg-slate-100 py-4 dark:bg-white/5"><PageThumb style={doc.page_style} /></div>
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{doc.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Edited {relativeTime(doc.updated_at)}</p>
              </Link>
              {doc.pinned && !showArchived && <Pin className="absolute left-3 top-3 h-4 w-4 fill-blue-600 text-blue-600" aria-label="Pinned" />}
              <div className="absolute right-2 top-2" data-doc-menu>
                <button type="button" onClick={() => setMenuId(menuId === doc.id ? null : doc.id)} aria-label={`Options for ${doc.title}`} className="rounded-lg bg-white/90 p-1.5 text-slate-500 opacity-0 shadow-sm transition-opacity hover:text-slate-800 focus:opacity-100 group-hover:opacity-100 dark:bg-[#1c2650]"><MoreHorizontal className="h-4 w-4" /></button>
                {menuId === doc.id && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-xl dark:border-white/10 dark:bg-[#121a3a]">
                    {showArchived ? (
                      <>
                        <button type="button" onClick={() => { setMenuId(null); archive(doc); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"><ArchiveRestore className="h-4 w-4" /> Restore</button>
                        <button type="button" onClick={() => { setMenuId(null); remove(doc); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /> Delete forever</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => { setMenuId(null); setRenaming(doc); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"><Pencil className="h-4 w-4" /> Rename</button>
                        <button type="button" onClick={() => { setMenuId(null); updateMeta(doc, { pinned: !doc.pinned }); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5">{doc.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />} {doc.pinned ? "Unpin" : "Pin to top"}</button>
                        <button type="button" onClick={() => { setMenuId(null); duplicate(doc); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"><Copy className="h-4 w-4" /> Duplicate</button>
                        <button type="button" onClick={() => { setMenuId(null); archive(doc); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"><Archive className="h-4 w-4" /> Archive</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 px-6 py-16 text-center dark:border-white/10">
          <FileText className="h-8 w-8 text-blue-500" />
          <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">{query ? "No documents match" : showArchived ? "Nothing archived" : "No documents yet"}</p>
          {!query && !showArchived && <button type="button" onClick={() => setCreating(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"><FilePlus2 className="h-4 w-4" /> Create your first document</button>}
        </div>
      )}

      {creating && (
        <Modal title="New document" description="Start blank or from a template." onClose={() => setCreating(false)} size="lg">
          <div className="grid gap-3 sm:grid-cols-3">
            {TEMPLATES.map((template) => (
              <button key={template.id} type="button" disabled={Boolean(busyTemplate)} onClick={() => create(template)} className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 p-4 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/50 disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/5">
                <PageThumb style={template.pageStyle} />
                <span>
                  <span className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">{busyTemplate === template.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{template.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{template.description}</span>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {renaming && (
        <Modal title="Rename document" onClose={() => setRenaming(null)} size="sm" footer={<button type="submit" form="rename-form" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Save</button>}>
          <form id="rename-form" onSubmit={async (event) => { event.preventDefault(); const value = new FormData(event.currentTarget).get("title").toString().trim(); if (value) await updateMeta(renaming, { title: value }); setRenaming(null); }}>
            <input name="title" defaultValue={renaming.title} autoFocus className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white" />
          </form>
        </Modal>
      )}
    </main>
  );
}
