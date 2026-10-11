import { useCallback, useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router";
import { FileText, GitBranch, Link2, Loader2, Plus, Search, StickyNote, X } from "../../lib/icons";
import { toast } from "sonner";
import Modal from "../../components/ui/Modal";
import { formatSupabaseError } from "../../lib/supabase";
import { addLink, LINK_TYPES, listLinks, removeLink, searchItems } from "./api";

const ICONS = { task: StickyNote, document: FileText, flow: GitBranch };
const TONES = { task: "text-amber-600", document: "text-amber-700", flow: "text-violet-600" };

function LinkPicker({ self, existing, onPick, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      searchItems(query, { limit: 8 })
        .then((items) => setResults(items.filter((item) => !(item.type === self.type && item.id === self.id) && !existing.some((link) => link.type === item.type && link.id === item.id))))
        .catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(timer.current);
  }, [query, self, existing]);

  return (
    <Modal title="Link to…" description="Connect this to a task, document or diagram. Links show up on both sides." onClose={onClose}>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title" className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-amber-400 dark:border-white/10 dark:bg-white/5 dark:text-white" />
      </div>
      {!results ? <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-amber-500" /></div> : results.length ? (
        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {results.map((item) => {
            const Icon = ICONS[item.type];
            return (
              <li key={`${item.type}-${item.id}`}>
                <button type="button" onClick={() => onPick(item)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-amber-50 dark:hover:bg-white/5">
                  <Icon className={`h-4 w-4 shrink-0 ${TONES[item.type]}`} />
                  <span className={`min-w-0 flex-1 truncate text-sm text-stone-800 dark:text-stone-200 ${item.done ? "line-through opacity-60" : ""}`}>{item.title}</span>
                  <span className="text-[11px] font-semibold text-stone-400">{LINK_TYPES[item.type]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : <p className="py-6 text-center text-sm text-stone-500">{query ? "Nothing matches." : "Nothing to link yet."}</p>}
    </Modal>
  );
}

function useLinks(type, id) {
  const [links, setLinks] = useState(null);
  const reload = useCallback(() => {
    listLinks(type, id).then(setLinks).catch(() => setLinks([]));
  }, [type, id]);
  useEffect(() => { reload(); }, [reload]);

  const add = async (item) => {
    try {
      await addLink({ type, id }, item);
      reload();
      toast.success(`Linked to "${item.title}"`);
    } catch (err) { toast.error(formatSupabaseError(err)); }
  };
  const remove = async (link) => {
    setLinks((current) => current.filter((item) => item.linkId !== link.linkId));
    try { await removeLink(link.linkId); } catch (err) { toast.error(formatSupabaseError(err)); reload(); }
  };
  return { links, add, remove };
}

function LinkList({ links, onRemove, onNavigate }) {
  return (
    <ul className="space-y-1">
      {links.map((link) => {
        const Icon = ICONS[link.type];
        return (
          <li key={link.linkId} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-50 dark:hover:bg-white/5">
            <Icon className={`h-4 w-4 shrink-0 ${TONES[link.type]}`} />
            <RouterLink to={link.href} onClick={onNavigate} className={`min-w-0 flex-1 truncate text-sm text-stone-800 hover:text-amber-800 hover:underline dark:text-stone-200 ${link.done ? "line-through opacity-60" : ""}`}>{link.title}</RouterLink>
            <button type="button" onClick={() => onRemove(link)} aria-label={`Unlink ${link.title}`} title="Unlink" className="rounded p-1 text-stone-400 opacity-0 hover:text-red-500 focus:opacity-100 group-hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
          </li>
        );
      })}
    </ul>
  );
}

/** Inline section (task editor). */
export function LinkedItemsSection({ type, id, labelClass }) {
  const { links, add, remove } = useLinks(type, id);
  const [picking, setPicking] = useState(false);
  return (
    <div>
      <span className={labelClass}>Linked</span>
      {links == null ? <Loader2 className="h-4 w-4 animate-spin text-stone-400" /> : (
        <>
          {links.length > 0 && <LinkList links={links} onRemove={remove} />}
          <button type="button" onClick={() => setPicking(true)} className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:hover:bg-white/5"><Plus className="h-3.5 w-3.5" /> Link a document, diagram or task</button>
        </>
      )}
      {picking && <LinkPicker self={{ type, id }} existing={links ?? []} onClose={() => setPicking(false)} onPick={(item) => { setPicking(false); add(item); }} />}
    </div>
  );
}

/** Header button with a popover (documents and diagrams). */
export function LinkedItemsButton({ type, id }) {
  const { links, add, remove } = useLinks(type, id);
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} title="Linked tasks, documents and diagrams" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100">
        <Link2 className="h-4 w-4" /> Links{links?.length ? <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800">{links.length}</span> : null}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[90] mt-1 w-72 rounded-xl border border-stone-200 bg-white p-2 shadow-xl">
          {links == null ? <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-stone-400" /></div> : links.length ? (
            <LinkList links={links} onRemove={remove} onNavigate={() => setOpen(false)} />
          ) : <p className="px-2 py-2 text-xs text-stone-500">Nothing linked yet. Link the tasks this relates to, so you can jump between them.</p>}
          <button type="button" onClick={() => { setPicking(true); setOpen(false); }} className="mt-1 inline-flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"><Plus className="h-3.5 w-3.5" /> Add link</button>
        </div>
      )}
      {picking && <LinkPicker self={{ type, id }} existing={links ?? []} onClose={() => setPicking(false)} onPick={(item) => { setPicking(false); add(item); }} />}
    </div>
  );
}
