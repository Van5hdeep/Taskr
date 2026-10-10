import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Archive, ArchiveRestore, Copy, GitBranch, HardDriveDownload, Loader2, MoreHorizontal, Pencil, Pin, PinOff, Plus, Search, Trash2, Workflow, X } from "lucide-react";
import { toast } from "sonner";
import Modal from "../../components/ui/Modal";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import StatusBanner from "../../components/ui/StatusBanner";
import { formatSupabaseError } from "../../lib/supabase";
import * as api from "./api";
import { layoutScene } from "./layout";
import { migrateFlow, TEMPLATES } from "./model";

const TYPE_LABELS = Object.fromEntries(TEMPLATES.map((template) => [template.id, template.label]));

function relativeTime(iso) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days} d ago` : new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function findLocalFlows() {
  const found = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith("taskr_flow_diagram_") || key.endsWith("_imported")) continue;
      const data = JSON.parse(localStorage.getItem(key) || "null");
      const scene = migrateFlow(data);
      if (scene.nodes.length) found.push({ key, title: data?.title || "Imported flow", scene });
    }
  } catch { /* ignore unreadable entries */ }
  return found;
}

export default function FlowsList() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [flows, setFlows] = useState(null);
  const [error, setError] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyTemplate, setBusyTemplate] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [localFlows, setLocalFlows] = useState(() => findLocalFlows());
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try { setFlows(await api.listFlows({ archived: showArchived })); } catch (err) { setError(formatSupabaseError(err)); }
  }, [showArchived]);

  useEffect(() => { setFlows(null); load(); }, [load]);
  useEffect(() => {
    if (!menuId) return undefined;
    const close = (event) => { if (!event.target.closest("[data-flow-card-menu]")) setMenuId(null); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menuId]);

  const visible = useMemo(() => (flows ?? []).filter((flow) => flow.title.toLowerCase().includes(query.trim().toLowerCase())), [flows, query]);

  const create = async (template) => {
    setBusyTemplate(template.id);
    try {
      const built = template.build();
      const scene = built.nodes.length ? { ...layoutScene(built, template.direction), direction: template.direction } : { ...built, direction: template.direction };
      const row = await api.createFlow({ title: template.title, scene });
      navigate(`/flow/${row.id}`);
    } catch (err) {
      toast.error(formatSupabaseError(err));
      setBusyTemplate(null);
    }
  };

  const updateMeta = async (flow, patch) => {
    try {
      const saved = await api.updateFlowMeta(flow.id, patch);
      setFlows((list) => list.map((item) => (item.id === flow.id ? saved : item)));
      return saved;
    } catch (err) { toast.error(formatSupabaseError(err)); return null; }
  };

  const archive = async (flow) => {
    if (!(await updateMeta(flow, { archived_at: showArchived ? null : new Date().toISOString() }))) return;
    setFlows((list) => list.filter((item) => item.id !== flow.id));
    if (!showArchived) toast(`Archived "${flow.title}"`, { action: { label: "Undo", onClick: async () => { await api.updateFlowMeta(flow.id, { archived_at: null }); load(); } } });
  };

  const remove = async (flow) => {
    if (!(await confirm({ title: `Delete "${flow.title}" forever?`, destructive: true }))) return;
    try {
      await api.deleteFlow(flow.id);
      setFlows((list) => list.filter((item) => item.id !== flow.id));
    } catch (err) { toast.error(formatSupabaseError(err)); }
  };

  const duplicate = async (flow) => {
    try {
      const copy = await api.duplicateFlow(flow.id);
      setFlows((list) => [copy, ...list]);
      toast.success("Duplicated");
    } catch (err) { toast.error(formatSupabaseError(err)); }
  };

  const runImport = async () => {
    setImporting(true);
    try {
      for (const local of localFlows) {
        await api.createFlow({ title: local.title, scene: local.scene });
        localStorage.setItem(`${local.key}_imported`, localStorage.getItem(local.key));
        localStorage.removeItem(local.key);
      }
      toast.success(`Imported ${localFlows.length} diagram${localFlows.length === 1 ? "" : "s"} from this browser`);
      setLocalFlows([]);
      load();
    } catch (err) {
      toast.error(formatSupabaseError(err, "Import failed."));
    } finally {
      setImporting(false);
    }
  };

  const item = "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 pb-28 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Flow</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Diagrams that tidy themselves — draw fast, press Tidy up, share as Mermaid.</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> New diagram</button>
      </header>

      {localFlows.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-500/30 dark:bg-blue-500/10">
          <HardDriveDownload className="h-5 w-5 text-blue-600" />
          <p className="flex-1 text-blue-900 dark:text-blue-100"><strong>A diagram from the earlier version</strong> is saved only in this browser. Import it to your account?</p>
          <button type="button" onClick={runImport} disabled={importing} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Import</button>
          <button type="button" onClick={() => setLocalFlows([])} className="rounded-lg p-1.5 text-blue-700" aria-label="Not now"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search diagrams" aria-label="Search diagrams" className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white" />
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} className="accent-blue-600" /> Archived</label>
      </div>

      <StatusBanner message={error} />

      {!flows && !error ? (
        <div className="flex min-h-[30vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
      ) : visible.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((flow) => (
            <article key={flow.id} className="group relative rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-white/10 dark:bg-[#0f1733]">
              <Link to={showArchived ? "#" : `/flow/${flow.id}`} onClick={(event) => { if (showArchived) event.preventDefault(); }} className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600"><GitBranch className="h-5 w-5" /></span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{flow.title}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{TYPE_LABELS[flow.diagram_type] ?? "Diagram"} · {relativeTime(flow.updated_at)}</span>
                </span>
              </Link>
              {flow.pinned && !showArchived && <Pin className="absolute right-11 top-4 h-4 w-4 fill-blue-600 text-blue-600" aria-label="Pinned" />}
              <div className="absolute right-3 top-3" data-flow-card-menu>
                <button type="button" onClick={() => setMenuId(menuId === flow.id ? null : flow.id)} aria-label={`Options for ${flow.title}`} className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-800 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-white/5"><MoreHorizontal className="h-4 w-4" /></button>
                {menuId === flow.id && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-xl dark:border-white/10 dark:bg-[#121a3a]">
                    {showArchived ? (
                      <>
                        <button type="button" onClick={() => { setMenuId(null); archive(flow); }} className={item}><ArchiveRestore className="h-4 w-4" /> Restore</button>
                        <button type="button" onClick={() => { setMenuId(null); remove(flow); }} className={`${item} !text-red-600`}><Trash2 className="h-4 w-4" /> Delete forever</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => { setMenuId(null); setRenaming(flow); }} className={item}><Pencil className="h-4 w-4" /> Rename</button>
                        <button type="button" onClick={() => { setMenuId(null); updateMeta(flow, { pinned: !flow.pinned }); }} className={item}>{flow.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />} {flow.pinned ? "Unpin" : "Pin to top"}</button>
                        <button type="button" onClick={() => { setMenuId(null); duplicate(flow); }} className={item}><Copy className="h-4 w-4" /> Duplicate</button>
                        <button type="button" onClick={() => { setMenuId(null); archive(flow); }} className={item}><Archive className="h-4 w-4" /> Archive</button>
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
          <Workflow className="h-8 w-8 text-violet-500" />
          <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">{query ? "No diagrams match" : showArchived ? "Nothing archived" : "No diagrams yet"}</p>
          {!query && !showArchived && <button type="button" onClick={() => setCreating(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> Create your first diagram</button>}
        </div>
      )}

      {creating && (
        <Modal title="New diagram" description="Start blank or from a template — you can paste Mermaid inside any diagram." onClose={() => setCreating(false)} size="lg">
          <div className="grid gap-3 sm:grid-cols-3">
            {TEMPLATES.map((template) => (
              <button key={template.id} type="button" disabled={Boolean(busyTemplate)} onClick={() => create(template)} className="rounded-2xl border border-slate-200 p-4 text-left transition-colors hover:border-blue-400 hover:bg-blue-50/50 disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/5">
                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">{busyTemplate === template.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{template.label}</span>
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{template.description}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {renaming && (
        <Modal title="Rename diagram" onClose={() => setRenaming(null)} size="sm" footer={<button type="submit" form="rename-flow" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Save</button>}>
          <form id="rename-flow" onSubmit={async (event) => { event.preventDefault(); const value = new FormData(event.currentTarget).get("title").toString().trim(); if (value) await updateMeta(renaming, { title: value }); setRenaming(null); }}>
            <input name="title" defaultValue={renaming.title} autoFocus className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white" />
          </form>
        </Modal>
      )}
    </main>
  );
}
