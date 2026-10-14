import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignStartHorizontal, AlignStartVertical,
  ArrowDown, ArrowUp, BringToFront, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, Eraser, FileImage, FileText,
  Grid3x3, Highlighter, Image as ImageIcon, Loader2, Lock, Maximize2, Minus, MousePointer2, PenLine, Plus, Printer, Redo,
  SendToBack, Shapes, StickyNote, Trash2, Type, Undo, Unlock, X,
} from "../../../lib/icons";
import { toast } from "sonner";
import { useConfirm } from "../../../components/ui/ConfirmDialog";
import { formatSupabaseError } from "../../../lib/supabase";
import { uploadImage } from "../api";
import { A4_HEIGHT, A4_WIDTH, deletePage, movePage, PAGE_GAP, PAGE_MARGIN, PAGE_STEP, PAGE_STYLES, uid } from "../model";
import { alignBlocks, distributeBlocks, intersects, normalizeRect, resizeRect, snapMove, snapTargets, unionBounds } from "../geometry";
import BlockFrame from "./BlockFrame";
import InkCanvas from "./InkCanvas";
import { touchRejected, trackPen } from "./ink/input";
import TextBlock from "./TextBlock";
import TextFormatBar from "./TextFormatBar";
import { ImageContent, NOTE_COLORS, resizeTable, SHAPE_TYPES, ShapeContent, StickerContent, TableContent } from "./SimpleBlocks";
import { exportPdf, exportPng, printPages } from "./exportPages";

const COLORS = ["#0f172a", "#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#64748b", "#ffffff"];
const INK_COLORS = ["#1e1e1e", "#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c"];
const HIGHLIGHT_COLORS = ["#facc15", "#4ade80", "#60a5fa", "#f472b6", "#c084fc"];
const CREATION_TOOLS = ["text", "table", "shape", "note"];

// Ink is drawn about 4.25 × strokeWidth pixels thick, so note-
// taking needs strokeWidths well below 1. Labels show the visible thickness.
const PEN_SIZES = [
  { id: "xfine", label: "Extra fine", width: 0.25 },
  { id: "fine", label: "Fine", width: 0.4 },
  { id: "medium", label: "Medium", width: 0.65 },
  { id: "bold", label: "Bold", width: 1 },
  { id: "marker", label: "Marker", width: 2 },
  { id: "heavy", label: "Heavy", width: 4 },
];
const HIGHLIGHTER_SIZES = [
  { id: "thin", label: "Thin", width: 2 },
  { id: "regular", label: "Regular", width: 3.5 },
  { id: "wide", label: "Wide", width: 5 },
];
const visiblePx = (width) => Math.max(0.5, Math.round(width * 4.25 * 2) / 2);
const INK_TOOLS = ["pen", "highlighter", "eraser"];

const isTypingTarget = (element) => element && (["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName) || element.isContentEditable);

function ToolButton({ active, onClick, title, children, disabled }) {
  return (
    <button type="button" onClick={onClick} title={title} aria-label={title} aria-pressed={active} disabled={disabled} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${active ? "bg-stone-900 dark:bg-amber-400 dark:text-stone-900 text-white shadow-sm" : "text-stone-600 hover:bg-stone-100"}`}>
      {children}
    </button>
  );
}

function Menu({ open, onClose, children, align = "left", width = "w-56" }) {
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!event.target.closest("[data-menu]")) onClose(); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open, onClose]);
  if (!open) return null;
  return <div data-menu className={`absolute top-full z-[80] mt-1 ${width} rounded-xl border border-stone-200 bg-white p-2 shadow-xl ${align === "right" ? "right-0" : "left-0"}`}>{children}</div>;
}

function GridPicker({ onPick }) {
  const [hover, setHover] = useState({ r: 0, c: 0 });
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-stone-500">{hover.r ? `${hover.r} × ${hover.c} table` : "Choose size"}</p>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(8, 1fr)" }} onMouseLeave={() => setHover({ r: 0, c: 0 })}>
        {Array.from({ length: 64 }, (_, i) => {
          const r = Math.floor(i / 8) + 1;
          const c = (i % 8) + 1;
          return <button key={i} type="button" aria-label={`${r} by ${c}`} onMouseEnter={() => setHover({ r, c })} onClick={() => onPick(r, c)} className={`h-5 w-5 rounded-sm border ${r <= hover.r && c <= hover.c ? "border-amber-500 bg-amber-500" : "border-stone-300 bg-white"}`} />;
        })}
      </div>
    </div>
  );
}

function Swatches({ colors, value, onPick, allowNone = false }) {
  return (
    <div className="flex items-center gap-1">
      {allowNone && <button type="button" onClick={() => onPick("transparent")} title="None" aria-label="None" className={`h-5 w-5 rounded border bg-white text-[10px] leading-none text-red-500 ${value === "transparent" ? "ring-2 ring-amber-400 ring-offset-1" : "border-stone-300"}`}>⁄</button>}
      {colors.map((color) => <button key={color} type="button" onClick={() => onPick(color)} title={color} aria-label={color} className={`h-5 w-5 rounded border ${value === color ? "ring-2 ring-amber-400 ring-offset-1" : "border-stone-300"}`} style={{ backgroundColor: color }} />)}
    </div>
  );
}

const Divider = () => <span className="mx-1 h-6 w-px bg-stone-200" />;

const PLUS_CURSOR = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="M14 5v18M5 14h18" stroke="white" stroke-width="5" stroke-linecap="round"/><path d="M14 5v18M5 14h18" stroke="#b45309" stroke-width="2.5" stroke-linecap="round"/></svg>')}") 14 14, copy`;

export default function DocumentEditor({ documentId, title, content, commit, undo, redo, canUndo, canRedo, pageStyle, onPageStyleChange }) {
  const confirm = useConfirm();
  const [tool, setTool] = useState("select");
  const [shapeType, setShapeType] = useState("rectangle");
  const [tableSize, setTableSize] = useState({ rows: 3, cols: 3 });
  const [noteColor, setNoteColor] = useState(NOTE_COLORS[0]);
  const [inkColor, setInkColor] = useState(INK_COLORS[0]);
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0]);
  const [penWidth, setPenWidth] = useState(PEN_SIZES[1].width);
  const [highlighterWidth, setHighlighterWidth] = useState(HIGHLIGHTER_SIZES[1].width);
  const [selection, setSelection] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [activeEditor, setActiveEditor] = useState(null);
  const [locked, setLocked] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [menu, setMenu] = useState(null); // "table" | "shape" | "note" | "export" | "page"
  const [preview, setPreview] = useState(null);
  const [cellMenu, setCellMenu] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [previewUrls, setPreviewUrls] = useState({});
  const [exporting, setExporting] = useState(null);
  const gesture = useRef(null);
  const [zoomBar, setZoomBar] = useState(null); // { x, y }: screen point the stylus is holding
  const inkRef = useRef(null);
  const zoomWrapRef = useRef(null);
  const zoomRef = useRef(1);
  const pageRefs = useRef(new Map());
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const clipboard = useRef(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  const { pages, blocks, ink } = content;
  const documentHeight = pages.length * A4_HEIGHT + (pages.length - 1) * PAGE_GAP;
  const blockById = useMemo(() => new Map(blocks.map((block) => [block.id, block])), [blocks]);
  const selectedBlocks = selection.map((id) => blockById.get(id)).filter(Boolean);
  const pageOf = (block) => (pages.some((page) => page.id === block.pageId) ? block.pageId : pages[0].id);

  // ─── Content mutations ────────────────────────────────────────────────

  const patchBlocks = useCallback((patches) => {
    commit((current) => ({ ...current, blocks: current.blocks.map((block) => (patches[block.id] ? { ...block, ...patches[block.id] } : block)) }));
  }, [commit]);
  const patchBlock = useCallback((id, patch) => patchBlocks({ [id]: patch }), [patchBlocks]);

  const addBlocks = useCallback((newBlocks, { select = true } = {}) => {
    commit((current) => ({ ...current, blocks: [...current.blocks, ...newBlocks] }));
    if (select) setSelection(newBlocks.map((block) => block.id));
  }, [commit]);

  const deleteSelection = useCallback(() => {
    if (!selection.length) return;
    const ids = new Set(selection);
    commit((current) => ({ ...current, blocks: current.blocks.filter((block) => !ids.has(block.id)) }));
    setSelection([]);
    setEditingId(null);
  }, [commit, selection]);

  const duplicateSelection = useCallback((offset = 24) => {
    const copies = selectedBlocks.map((block) => ({ ...structuredClone(block), id: uid(), x: block.x + offset, y: block.y + offset }));
    if (copies.length) addBlocks(copies);
  }, [addBlocks, selectedBlocks]);

  const reorder = useCallback((toFront) => {
    const ids = new Set(selection);
    commit((current) => {
      const moving = current.blocks.filter((block) => ids.has(block.id));
      const rest = current.blocks.filter((block) => !ids.has(block.id));
      return { ...current, blocks: toFront ? [...rest, ...moving] : [...moving, ...rest] };
    });
  }, [commit, selection]);

  const commitInk = useCallback((elements) => commit((current) => ({ ...current, ink: elements })), [commit]);

  // ─── Pages ─────────────────────────────────────────────────────────────

  const scrollToPage = useCallback((index) => {
    scrollRef.current?.scrollTo({ top: index * PAGE_STEP * zoom, behavior: "smooth" });
    setCurrentPage(index);
  }, [zoom]);

  const addPage = () => {
    const index = currentPage + 1;
    commit((current) => {
      // Inserting shifts ink on later pages down by one page.
      const ink2 = current.ink.map((element) => (element.y >= index * PAGE_STEP ? { ...element, y: element.y + PAGE_STEP } : element));
      const pages2 = [...current.pages];
      pages2.splice(index, 0, { id: uid() });
      return { ...current, pages: pages2, ink: ink2 };
    });
    requestAnimationFrame(() => scrollToPage(index));
  };

  const removePage = async () => {
    if (pages.length <= 1) return;
    const page = pages[currentPage];
    const hasContent = blocks.some((block) => pageOf(block) === page.id) || ink.some((element) => Math.floor(element.y / PAGE_STEP) === currentPage);
    if (hasContent && !(await confirm({ title: `Delete page ${currentPage + 1}?`, message: "Everything on this page is removed. You can undo this.", destructive: true }))) return;
    commit((current) => deletePage(current, page.id));
    setCurrentPage((index) => Math.max(0, Math.min(index, pages.length - 2)));
  };

  const shiftPage = (direction) => {
    const page = pages[currentPage];
    commit((current) => movePage(current, page.id, direction));
    requestAnimationFrame(() => scrollToPage(currentPage + direction));
  };

  // ─── Images ────────────────────────────────────────────────────────────

  const insertImages = useCallback(async (files, pageId, point) => {
    for (const [index, file] of [...files].filter((item) => item.type.startsWith("image/")).entries()) {
      const id = uid();
      const url = URL.createObjectURL(file);
      const size = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth || 300, h: img.naturalHeight || 200 });
        img.onerror = () => resolve({ w: 300, h: 200 });
        img.src = url;
      });
      const width = Math.min(size.w, A4_WIDTH - PAGE_MARGIN * 2, 420);
      const height = width * (size.h / size.w);
      const x = Math.max(PAGE_MARGIN, Math.min(A4_WIDTH - PAGE_MARGIN - width, point.x - width / 2 + index * 24));
      const y = Math.max(PAGE_MARGIN, Math.min(A4_HEIGHT - PAGE_MARGIN - height, point.y - height / 2 + index * 24));
      setPreviewUrls((current) => ({ ...current, [id]: url }));
      addBlocks([{ id, type: "image", pageId, x, y, width, height, assetPath: null }]);
      try {
        const path = await uploadImage(documentId, file);
        commit((current) => ({ ...current, blocks: current.blocks.map((block) => (block.id === id ? { ...block, assetPath: path } : block)) }));
      } catch (err) {
        commit((current) => ({ ...current, blocks: current.blocks.filter((block) => block.id !== id) }));
        toast.error(formatSupabaseError(err, "Image upload failed."));
      }
    }
  }, [addBlocks, commit, documentId]);

  const pageCenter = () => ({ pageId: pages[currentPage]?.id ?? pages[0].id, point: { x: A4_WIDTH / 2, y: A4_HEIGHT / 3 } });

  // ─── Gestures ──────────────────────────────────────────────────────────

  const pagePoint = (event, pageId) => {
    const rect = pageRefs.current.get(pageId)?.getBoundingClientRect();
    return rect ? { x: (event.clientX - rect.left) / zoom, y: (event.clientY - rect.top) / zoom } : { x: 0, y: 0 };
  };

  const onBlockPointerDown = (event, block, { mode, handle }) => {
    if (locked || tool !== "select") return;
    event.stopPropagation();
    if (editingId && editingId !== block.id) setEditingId(null);
    if (mode === "select") {
      if (!selection.includes(block.id)) setSelection([block.id]);
      return;
    }
    if (event.shiftKey && mode === "move") {
      setSelection((current) => (current.includes(block.id) ? current.filter((id) => id !== block.id) : [...current, block.id]));
      return;
    }
    const wasSelected = selection.includes(block.id);
    const ids = mode === "move" && wasSelected ? selection : [block.id];
    if (!wasSelected) setSelection([block.id]);
    const moving = ids.map((id) => blockById.get(id)).filter(Boolean);
    gesture.current = {
      type: mode,
      handle,
      ids,
      blockId: block.id,
      wasSelected,
      pageId: pageOf(block),
      startX: event.clientX,
      startY: event.clientY,
      box: unionBounds(moving),
      start: { x: block.x, y: block.y, w: block.width, h: block.height },
      targets: snapTargets(blocks.filter((item) => pageOf(item) === pageOf(block) && !ids.includes(item.id))),
      keepRatio: block.type === "image" || (block.type === "shape" && block.shapeType === "circle"),
      moved: false,
    };
    setPreview({ type: mode, ids, dx: 0, dy: 0, rect: null, guides: [] });
  };

  // Nothing on the document yet: the page cursor becomes a "+" and a click starts a text box.
  const startHere = !locked && tool === "select" && blocks.length === 0 && ink.length === 0;

  const onPagePointerDown = (event, page, pageIndex) => {
    if (locked || event.button !== 0 || INK_TOOLS.includes(tool)) return;
    if (event.target.closest("[data-block-id]")) return;
    // Stylus ink and finger pan/zoom are handled natively by the scroll area (see the effect below).
    if (tool === "select" && event.pointerType === "pen") { setCurrentPage(pageIndex); setEditingId(null); setSelection([]); return; }
    if (tool === "select" && event.pointerType === "touch" && (touchRejected(event) || !startHere)) return;
    setCurrentPage(pageIndex);
    setEditingId(null);
    const point = pagePoint(event, page.id);
    if (tool === "select" && startHere) {
      gesture.current = { type: "create", tool: "text", auto: true, pageId: page.id, origin: point, startX: event.clientX, startY: event.clientY };
      setPreview({ type: "create", pageId: page.id, rect: { ...point, w: 0, h: 0 } });
      return;
    }
    if (tool === "select") {
      const base = event.shiftKey ? selection : [];
      if (!event.shiftKey) setSelection([]);
      gesture.current = { type: "marquee", pageId: page.id, origin: point, startX: event.clientX, startY: event.clientY, base };
      setPreview({ type: "marquee", pageId: page.id, rect: { ...point, w: 0, h: 0 } });
      return;
    }
    if (CREATION_TOOLS.includes(tool)) {
      gesture.current = { type: "create", pageId: page.id, origin: point, startX: event.clientX, startY: event.clientY };
      setPreview({ type: "create", pageId: page.id, rect: { ...point, w: 0, h: 0 } });
    }
  };

  useEffect(() => {
    if (!preview) return undefined;
    const onMove = (event) => {
      const g = gesture.current;
      if (!g) return;
      const dx = (event.clientX - g.startX) / zoom;
      const dy = (event.clientY - g.startY) / zoom;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) g.moved = true;
      if (g.auto && Math.hypot(event.clientX - g.startX, event.clientY - g.startY) > 4) {
        gesture.current = null;
        setPreview(null);
        inkRef.current?.begin({ clientX: g.startX, clientY: g.startY, pointerId: event.pointerId, pointerType: event.pointerType, pressure: event.pressure });
        return;
      }
      if (g.type === "move") {
        const snapped = event.altKey ? { dx, dy, guides: [] } : snapMove(g.box, dx, dy, g.targets, 6 / zoom);
        g.dx = snapped.dx;
        g.dy = snapped.dy;
        setPreview({ type: "move", ids: g.ids, dx: snapped.dx, dy: snapped.dy, guides: snapped.guides, pageId: g.pageId });
      } else if (g.type === "resize") {
        g.rect = resizeRect(g.start, g.handle, dx, dy, { keepRatio: g.keepRatio !== event.shiftKey, min: 24 });
        setPreview({ type: "resize", ids: g.ids, rect: g.rect });
      } else if (g.type === "marquee" || g.type === "create") {
        const point = { x: g.origin.x + dx, y: g.origin.y + dy };
        g.rect = normalizeRect(g.origin.x, g.origin.y, point.x, point.y);
        // A circle is drawn in a square box so its frame hugs the shape (Shift does the same for any shape).
        if (g.type === "create" && tool === "shape" && (shapeType === "circle" || event.shiftKey)) {
          const side = Math.max(g.rect.w, g.rect.h);
          g.rect = normalizeRect(g.origin.x, g.origin.y, g.origin.x + Math.sign(dx || 1) * side, g.origin.y + Math.sign(dy || 1) * side);
        }
        setPreview({ type: g.type, pageId: g.pageId, rect: g.rect });
      }
    };

    const onUp = () => {
      const g = gesture.current;
      gesture.current = null;
      setPreview(null);
      if (!g) return;
      if (g.type === "move") {
        if (g.moved) {
          const patches = {};
          for (const id of g.ids) {
            const block = contentRef.current.blocks.find((item) => item.id === id);
            if (block) patches[id] = { x: Math.round(block.x + g.dx), y: Math.round(block.y + g.dy) };
          }
          patchBlocks(patches);
        } else if (g.wasSelected && blockById.get(g.blockId)?.type === "text") {
          setEditingId(g.blockId);
        }
      }
      if (g.type === "resize" && g.rect && g.moved) {
        patchBlock(g.blockId, { x: Math.round(g.rect.x), y: Math.round(g.rect.y), width: Math.round(g.rect.w), height: Math.round(g.rect.h) });
      }
      if (g.type === "marquee" && g.rect && g.moved) {
        const hits = contentRef.current.blocks.filter((block) => pageOf(block) === g.pageId && intersects(g.rect, { x: block.x, y: block.y, w: block.width, h: block.height })).map((block) => block.id);
        setSelection([...new Set([...g.base, ...hits])]);
      }
      if (g.type === "create") createFromGesture(g);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
  }, [preview !== null, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  const createFromGesture = (g) => {
    const dragged = g.moved && g.rect && g.rect.w > 8 && g.rect.h > 8;
    const at = (w, h) => (dragged ? { x: g.rect.x, y: g.rect.y, width: Math.max(w.min, g.rect.w), height: Math.max(h.min, g.rect.h) } : { x: g.origin.x, y: g.origin.y, width: w.default, height: h.default });
    const kind = g.tool ?? tool;
    const id = uid();
    let block;
    if (kind === "text") block = { id, type: "text", pageId: g.pageId, framed: false, fontSize: 16, doc: { type: "doc", content: [{ type: "paragraph" }] }, ...at({ min: 60, default: 320 }, { min: 32, default: 60 }) };
    if (kind === "table") block = { id, type: "table", pageId: g.pageId, rows: tableSize.rows, cols: tableSize.cols, headerRow: false, data: Array.from({ length: tableSize.rows }, () => Array(tableSize.cols).fill("")), fill: "transparent", stroke: "#334155", strokeWidth: 1, ...at({ min: tableSize.cols * 40, default: Math.min(A4_WIDTH - PAGE_MARGIN * 2, tableSize.cols * 110) }, { min: tableSize.rows * 24, default: tableSize.rows * 34 }) };
    if (kind === "shape") block = { id, type: "shape", shapeType, pageId: g.pageId, fill: "transparent", stroke: "#2563eb", strokeWidth: 2, ...at({ min: 16, default: shapeType === "circle" ? 100 : 140 }, { min: 16, default: shapeType === "line" || shapeType === "arrow" ? 40 : 100 }) };
    if (kind === "note") block = { id, type: "sticker", pageId: g.pageId, color: noteColor, text: "", ...at({ min: 80, default: 180 }, { min: 80, default: 180 }) };
    if (!block) return;
    block.x = Math.max(0, Math.min(A4_WIDTH - 20, block.x));
    block.y = Math.max(0, Math.min(A4_HEIGHT - 20, block.y));
    addBlocks([block]);
    setTool("select");
    if (block.type === "text") setEditingId(id);
  };

  // ─── Keyboard, paste, scroll ───────────────────────────────────────────

  useEffect(() => {
    const onKey = (event) => {
      if (isTypingTarget(document.activeElement)) return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (mod && key === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
      if (mod && key === "y") { event.preventDefault(); redo(); return; }
      if (locked) return;
      if (mod && key === "c" && selectedBlocks.length) { clipboard.current = structuredClone(selectedBlocks); return; }
      if (mod && key === "x" && selectedBlocks.length) { clipboard.current = structuredClone(selectedBlocks); deleteSelection(); return; }
      if (mod && key === "d") { event.preventDefault(); duplicateSelection(); return; }
      if (mod && key === "a") { event.preventDefault(); setSelection(blocks.filter((block) => pageOf(block) === pages[currentPage]?.id).map((block) => block.id)); return; }
      if (mod && event.key === "]") { event.preventDefault(); reorder(true); return; }
      if (mod && event.key === "[") { event.preventDefault(); reorder(false); return; }
      if ((event.key === "Delete" || event.key === "Backspace") && selection.length) { event.preventDefault(); deleteSelection(); return; }
      if (event.key === "Escape") { setSelection([]); setEditingId(null); setTool("select"); setMenu(null); return; }
      if (event.key.startsWith("Arrow") && selection.length) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
        patchBlocks(Object.fromEntries(selectedBlocks.map((block) => [block.id, { x: block.x + dx, y: block.y + dy }])));
        return;
      }
      if (mod || event.altKey) return;
      const shortcuts = { v: "select", t: "text", n: "note", p: "pen", h: "highlighter", e: "eraser", r: "shape" };
      if (shortcuts[key]) { setTool(shortcuts[key]); if (key === "r") setShapeType("rectangle"); }
    };
    const onPaste = (event) => {
      if (locked || isTypingTarget(document.activeElement)) return;
      const files = [...(event.clipboardData?.files ?? [])].filter((file) => file.type.startsWith("image/"));
      if (files.length) {
        event.preventDefault();
        const { pageId, point } = pageCenter();
        insertImages(files, pageId, point);
      } else if (clipboard.current?.length) {
        event.preventDefault();
        const pageId = pages[currentPage]?.id ?? pages[0].id;
        addBlocks(clipboard.current.map((block) => ({ ...structuredClone(block), id: uid(), pageId, x: block.x + 24, y: block.y + 24 })));
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("paste", onPaste);
    };
  });

  // ─── Zoom, finger pan/pinch, stylus ink ───────────────────────────────

  zoomRef.current = zoom;
  /** Zoom keeping the document point under (clientX, clientY) where it is on screen. */
  const zoomAround = useCallback((next, clientX, clientY) => {
    const wrap = zoomWrapRef.current;
    const scroller = scrollRef.current;
    const value = Math.round(Math.min(3, Math.max(0.25, next)) * 100) / 100;
    if (!wrap || !scroller || value === zoomRef.current) return;
    const before = wrap.getBoundingClientRect();
    const docX = (clientX - before.left) / zoomRef.current;
    const docY = (clientY - before.top) / zoomRef.current;
    zoomRef.current = value;
    flushSync(() => setZoom(value));
    const after = wrap.getBoundingClientRect();
    scroller.scrollLeft += after.left + docX * value - clientX;
    scroller.scrollTop += after.top + docY * value - clientY;
  }, []);

  useEffect(() => trackPen(), []);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return undefined;
    const touches = new Map();
    let pinch = null;
    let inertia = 0;
    let hold = null;
    const stopInertia = () => { cancelAnimationFrame(inertia); inertia = 0; };
    const clearHold = () => {
      if (!hold) return;
      clearTimeout(hold.timer);
      window.removeEventListener("pointermove", hold.onMove);
      window.removeEventListener("pointerup", hold.clear);
      window.removeEventListener("pointercancel", hold.clear);
      hold = null;
    };

    // Stylus held still for a moment → drop the dot it just made and offer zoom at that point.
    const armStylusHold = (event) => {
      clearHold();
      const start = { x: event.clientX, y: event.clientY };
      hold = {
        timer: setTimeout(() => { clearHold(); inkRef.current?.cancel(); setZoomBar({ x: start.x, y: start.y }); }, 520),
        onMove: (move) => { if (Math.hypot(move.clientX - start.x, move.clientY - start.y) > 6) clearHold(); },
        clear: clearHold,
      };
      window.addEventListener("pointermove", hold.onMove);
      window.addEventListener("pointerup", hold.clear);
      window.addEventListener("pointercancel", hold.clear);
    };

    const onMove = (event) => {
      const touch = touches.get(event.pointerId);
      if (!touch) return;
      const dx = event.clientX - touch.x;
      const dy = event.clientY - touch.y;
      touch.x = event.clientX;
      touch.y = event.clientY;
      if (touches.size >= 2) {
        const [a, b] = [...touches.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (!pinch) pinch = { dist, zoom: zoomRef.current, mid };
        zoomAround(pinch.zoom * (dist / pinch.dist), mid.x, mid.y);
        scroller.scrollLeft -= mid.x - pinch.mid.x;
        scroller.scrollTop -= mid.y - pinch.mid.y;
        pinch.mid = mid;
      } else if (!touch.claimed) {
        scroller.scrollLeft -= dx;
        scroller.scrollTop -= dy;
        touch.vx = dx;
        touch.vy = dy;
      }
    };
    const onEnd = (event) => {
      const touch = touches.get(event.pointerId);
      if (!touch) return;
      touches.delete(event.pointerId);
      pinch = null;
      if (!touches.size) {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
        if (event.type === "pointerup" && !touch.claimed && Math.hypot(touch.vx ?? 0, touch.vy ?? 0) > 3) {
          let vx = touch.vx;
          let vy = touch.vy;
          const glide = () => {
            scroller.scrollLeft -= vx;
            scroller.scrollTop -= vy;
            vx *= 0.93;
            vy *= 0.93;
            inertia = Math.hypot(vx, vy) > 0.5 ? requestAnimationFrame(glide) : 0;
          };
          inertia = requestAnimationFrame(glide);
        }
      }
    };

    const onDown = (event) => {
      stopInertia();
      if (event.pointerType === "touch") {
        if (touchRejected(event)) return; // palm, or a hand next to the stylus
        if (!touches.size) {
          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onEnd);
          window.addEventListener("pointercancel", onEnd);
        }
        const onControl = Boolean(event.target.closest?.("[data-block-id], input, textarea, button, [contenteditable=true]"));
        touches.set(event.pointerId, { x: event.clientX, y: event.clientY, claimed: Boolean(event.inkClaimed) || onControl });
        if (touches.size === 2) { inkRef.current?.cancel(); pinch = null; }
        return;
      }
      if (event.pointerType !== "pen" || (event.button > 0 && event.button !== 5)) return;
      if (!event.target.closest?.("[data-page]") || event.target.closest("[data-block-id]")) return;
      if (!event.inkClaimed && tool === "select" && !locked && inkRef.current?.begin(event)) event.inkClaimed = true;
      if (event.inkClaimed && tool !== "eraser" && event.button !== 5 && !(event.buttons & 32)) armStylusHold(event);
    };
    scroller.addEventListener("pointerdown", onDown);
    return () => {
      scroller.removeEventListener("pointerdown", onDown);
      stopInertia();
      clearHold();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };
  }, [tool, locked, zoomAround]);

  useEffect(() => {
    if (!zoomBar) return undefined;
    const close = (event) => { if (!event.target.closest?.("[data-zoombar]")) setZoomBar(null); };
    // Registered a tick late so the pointer-up that ends the long press doesn't close it.
    const timer = setTimeout(() => document.addEventListener("pointerdown", close, true), 0);
    return () => { clearTimeout(timer); document.removeEventListener("pointerdown", close, true); };
  }, [zoomBar]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return undefined;
    const onWheel = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      // Trackpad pinch arrives as small ctrl+wheel deltas, a mouse wheel notch as ~100.
      zoomAround(zoomRef.current * Math.exp(-event.deltaY * (Math.abs(event.deltaY) >= 50 ? 0.0015 : 0.006)), event.clientX, event.clientY);
    };
    // Safari (Mac laptops) reports trackpad pinch as gesture events instead.
    let gestureStart = 1;
    const onGestureStart = (event) => { event.preventDefault(); gestureStart = zoomRef.current; };
    const onGestureChange = (event) => { event.preventDefault(); zoomAround(gestureStart * event.scale, event.clientX, event.clientY); };
    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("gesturestart", onGestureStart);
    element.addEventListener("gesturechange", onGestureChange);
    return () => {
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("gesturestart", onGestureStart);
      element.removeEventListener("gesturechange", onGestureChange);
    };
  }, []);

  useEffect(() => { if (tool !== "select") { setEditingId(null); if (!CREATION_TOOLS.includes(tool)) setSelection([]); } }, [tool]);
  useEffect(() => { if (!editingId) setActiveEditor(null); }, [editingId]);
  // Drop ids of blocks removed by undo/redo or page deletion.
  useEffect(() => {
    setSelection((current) => (current.every((id) => blockById.has(id)) ? current : current.filter((id) => blockById.has(id))));
    if (editingId && !blockById.has(editingId)) setEditingId(null);
  }, [blockById, editingId]);

  const onScroll = (event) => {
    const index = Math.round(event.currentTarget.scrollTop / (PAGE_STEP * zoom));
    setCurrentPage(Math.max(0, Math.min(pages.length - 1, index)));
  };

  // ─── Export ────────────────────────────────────────────────────────────

  const runExport = async (kind) => {
    setMenu(null);
    setSelection([]);
    setEditingId(null);
    setExporting(kind);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
      const elements = pages.map((page) => pageRefs.current.get(page.id));
      if (kind === "pdf") await exportPdf(elements, ink, title);
      if (kind === "png") await exportPng(elements[currentPage], ink, currentPage, pages.length, title);
      if (kind === "print") await printPages(elements, ink, title);
    } catch (err) {
      toast.error(`Export failed: ${err?.message ?? err}`);
    } finally {
      setExporting(null);
    }
  };

  // ─── Rendering helpers ─────────────────────────────────────────────────

  const rectFor = (block) => {
    if (preview?.type === "move" && preview.ids.includes(block.id)) return { x: block.x + preview.dx, y: block.y + preview.dy, w: block.width, h: block.height };
    if (preview?.type === "resize" && preview.ids[0] === block.id && preview.rect) return preview.rect;
    return { x: block.x, y: block.y, w: block.width, h: block.height };
  };

  const single = selectedBlocks.length === 1 ? selectedBlocks[0] : null;
  const interactive = !locked && tool === "select";

  const renderBlock = (block) => {
    const selected = selection.includes(block.id);
    const editing = editingId === block.id;
    const commonFrame = {
      block,
      rect: rectFor(block),
      selected,
      showHandles: selected && selection.length === 1 && !editing,
      interactive,
      editing,
      onPointerDown: onBlockPointerDown,
    };
    if (block.type === "text") {
      return (
        <BlockFrame key={block.id} {...commonFrame} grip autoHeight onDoubleClick={() => { if (interactive) { setSelection([block.id]); setEditingId(block.id); } }}>
          <TextBlock block={block} editing={editing && !locked} onCommit={(patch) => patchBlock(block.id, patch)} onEditorReady={setActiveEditor} onExit={() => setEditingId(null)} />
        </BlockFrame>
      );
    }
    if (block.type === "table") {
      return (
        <BlockFrame key={block.id} {...commonFrame} grip>
          <TableContent block={block} readOnly={locked} onCommit={(patch) => patchBlock(block.id, patch)} onCellMenu={(event, r, c) => { setSelection([block.id]); setCellMenu({ x: event.clientX, y: event.clientY, blockId: block.id, r, c }); }} />
        </BlockFrame>
      );
    }
    if (block.type === "sticker") {
      return <BlockFrame key={block.id} {...commonFrame} grip><StickerContent block={block} readOnly={locked} onCommit={(patch) => patchBlock(block.id, patch)} /></BlockFrame>;
    }
    if (block.type === "image") {
      return <BlockFrame key={block.id} {...commonFrame}><ImageContent block={block} previewUrl={previewUrls[block.id]} /></BlockFrame>;
    }
    if (block.type === "shape") {
      const rect = rectFor(block);
      return <BlockFrame key={block.id} {...commonFrame} outline="subtle"><ShapeContent block={block} w={rect.w} h={rect.h} /></BlockFrame>;
    }
    return null;
  };

  const tableCell = cellMenu ? blockById.get(cellMenu.blockId) : null;
  const tableAction = (change) => {
    if (!tableCell) return;
    if (change.type === "toggleHeader") patchBlock(tableCell.id, { headerRow: !tableCell.headerRow });
    else patchBlock(tableCell.id, resizeTable(tableCell, change));
    setCellMenu(null);
  };

  const hint = tool === "text" ? "Click for a text box, or drag to size it."
    : tool === "table" ? `${tableSize.rows} × ${tableSize.cols} table — click or drag on the page.`
      : tool === "shape" ? `${SHAPE_TYPES.find((item) => item.id === shapeType)?.label} — click or drag on the page.`
        : tool === "note" ? "Click or drag to place a sticky note."
          : tool === "eraser" ? "Drag across handwriting to erase whole strokes."
            : null;

  const inkTool = INK_TOOLS.includes(tool);
  const strokeFor = (block) => block.stroke ?? (block.type === "table" ? "#334155" : "transparent");

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${locked ? "workspace-locked" : ""}`}>
      {/* Primary toolbar */}
      <div className="flex-none border-b border-stone-200 bg-white px-3 py-1.5">
        <div className="flex flex-wrap items-center gap-0.5">
          <ToolButton title="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}><Undo className="h-4 w-4" /></ToolButton>
          <ToolButton title="Redo (Ctrl+Y)" onClick={redo} disabled={!canRedo}><Redo className="h-4 w-4" /></ToolButton>
          <Divider />
          <ToolButton title="Select (V)" active={tool === "select"} onClick={() => setTool("select")}><MousePointer2 className="h-4 w-4" /><span className="hidden xl:inline">Select</span></ToolButton>
          <ToolButton title="Text box (T)" active={tool === "text"} onClick={() => setTool("text")} disabled={locked}><Type className="h-4 w-4" /><span className="hidden xl:inline">Text</span></ToolButton>
          <div className="relative" data-menu>
            <ToolButton title="Table" active={tool === "table" || menu === "table"} onClick={() => setMenu(menu === "table" ? null : "table")} disabled={locked}><Grid3x3 className="h-4 w-4" /><span className="hidden xl:inline">Table</span><ChevronDown className="h-3 w-3" /></ToolButton>
            <Menu open={menu === "table"} onClose={() => setMenu(null)}><GridPicker onPick={(rows, cols) => { setTableSize({ rows, cols }); setTool("table"); setMenu(null); }} /></Menu>
          </div>
          <div className="relative" data-menu>
            <ToolButton title="Shape (R)" active={tool === "shape" || menu === "shape"} onClick={() => setMenu(menu === "shape" ? null : "shape")} disabled={locked}><Shapes className="h-4 w-4" /><span className="hidden xl:inline">Shape</span><ChevronDown className="h-3 w-3" /></ToolButton>
            <Menu open={menu === "shape"} onClose={() => setMenu(null)}>
              <div className="grid grid-cols-2 gap-1">
                {SHAPE_TYPES.map((shape) => (
                  <button key={shape.id} type="button" onClick={() => { setShapeType(shape.id); setTool("shape"); setMenu(null); }} className="rounded-lg px-2 py-1.5 text-left text-xs font-medium text-stone-700 hover:bg-amber-50">{shape.label}</button>
                ))}
              </div>
            </Menu>
          </div>
          <div className="relative" data-menu>
            <ToolButton title="Sticky note (N)" active={tool === "note" || menu === "note"} onClick={() => setMenu(menu === "note" ? null : "note")} disabled={locked}><StickyNote className="h-4 w-4" /><ChevronDown className="h-3 w-3" /></ToolButton>
            <Menu open={menu === "note"} onClose={() => setMenu(null)} width="w-auto">
              <div className="flex gap-2">{NOTE_COLORS.map((color) => <button key={color} type="button" aria-label={`Note ${color}`} onClick={() => { setNoteColor(color); setTool("note"); setMenu(null); }} className="h-8 w-8 rounded-lg border border-stone-300" style={{ backgroundColor: color }} />)}</div>
            </Menu>
          </div>
          <ToolButton title="Insert image (or paste / drop one)" onClick={() => fileInputRef.current?.click()} disabled={locked}><ImageIcon className="h-4 w-4" /></ToolButton>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" multiple className="hidden" onChange={(event) => { const { pageId, point } = pageCenter(); insertImages(event.target.files ?? [], pageId, point); event.target.value = ""; }} />
          <Divider />
          <ToolButton title="Pen (P)" active={tool === "pen"} onClick={() => setTool("pen")} disabled={locked}><PenLine className="h-4 w-4" /><span className="hidden xl:inline">Pen</span></ToolButton>
          <ToolButton title="Highlighter (H)" active={tool === "highlighter"} onClick={() => setTool("highlighter")} disabled={locked}><Highlighter className="h-4 w-4" /></ToolButton>
          <ToolButton title="Eraser (E)" active={tool === "eraser"} onClick={() => setTool("eraser")} disabled={locked}><Eraser className="h-4 w-4" /></ToolButton>
          <Divider />
          <ToolButton title={locked ? "Unlock editing" : "Lock (read-only)"} active={locked} onClick={() => { setLocked((value) => !value); setTool("select"); setSelection([]); }}>{locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}</ToolButton>
          <div className="ml-auto flex items-center gap-1">
            <div className="relative" data-menu>
              <ToolButton title="Page style" active={menu === "page"} onClick={() => setMenu(menu === "page" ? null : "page")}><FileText className="h-4 w-4" /><span className="hidden lg:inline">{PAGE_STYLES.find((style) => style.id === pageStyle)?.label}</span><ChevronDown className="h-3 w-3" /></ToolButton>
              <Menu open={menu === "page"} onClose={() => setMenu(null)} align="right" width="w-40">
                {PAGE_STYLES.map((style) => <button key={style.id} type="button" onClick={() => { onPageStyleChange(style.id); setMenu(null); }} className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm ${style.id === pageStyle ? "bg-amber-50 font-semibold text-amber-800" : "text-stone-700 hover:bg-stone-50"}`}>{style.label}</button>)}
              </Menu>
            </div>
            <div className="relative" data-menu>
              <ToolButton title="Export" active={menu === "export"} onClick={() => setMenu(menu === "export" ? null : "export")} disabled={Boolean(exporting)}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}<span className="hidden lg:inline">Export</span><ChevronDown className="h-3 w-3" />
              </ToolButton>
              <Menu open={menu === "export"} onClose={() => setMenu(null)} align="right" width="w-52">
                <button type="button" onClick={() => runExport("pdf")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"><FileText className="h-4 w-4 text-rose-500" /> PDF (all pages)</button>
                <button type="button" onClick={() => runExport("png")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"><FileImage className="h-4 w-4 text-amber-500" /> PNG (this page)</button>
                <button type="button" onClick={() => runExport("print")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"><Printer className="h-4 w-4 text-stone-500" /> Print</button>
              </Menu>
            </div>
          </div>
        </div>

        {/* Context row */}
        {(activeEditor || inkTool || (single || selectedBlocks.length > 1) || hint) && (
          <div className="mt-1.5 flex min-h-9 flex-wrap items-center gap-2 border-t border-stone-100 pt-1.5">
            {activeEditor && editingId ? <TextFormatBar editor={activeEditor} /> : inkTool ? (
              <>
                {tool !== "eraser" && (
                  <>
                    <Swatches colors={tool === "highlighter" ? HIGHLIGHT_COLORS : INK_COLORS} value={tool === "highlighter" ? highlightColor : inkColor} onPick={tool === "highlighter" ? setHighlightColor : setInkColor} />
                    <Divider />
                    <div className="flex items-center gap-1" role="radiogroup" aria-label="Thickness">
                      {(tool === "highlighter" ? HIGHLIGHTER_SIZES : PEN_SIZES).map((size) => {
                        const current = tool === "highlighter" ? highlighterWidth : penWidth;
                        const px = visiblePx(size.width);
                        return (
                          <button
                            key={size.id}
                            type="button"
                            role="radio"
                            aria-checked={current === size.width}
                            title={`${size.label} (~${px}px)`}
                            onClick={() => (tool === "highlighter" ? setHighlighterWidth(size.width) : setPenWidth(size.width))}
                            className={`flex h-8 w-10 items-center justify-center rounded-md ${current === size.width ? "bg-amber-100 ring-1 ring-amber-400" : "hover:bg-stone-100"}`}
                          >
                            <span className="block w-6 rounded-full" style={{ height: Math.min(px, 14), backgroundColor: tool === "highlighter" ? highlightColor : inkColor, opacity: tool === "highlighter" ? 0.5 : 1 }} />
                          </button>
                        );
                      })}
                    </div>
                    {tool === "pen" && (
                      <label className="ml-1 flex items-center gap-2 text-xs text-stone-500">
                        <input type="range" min="0.15" max="4" step="0.05" value={penWidth} onChange={(event) => setPenWidth(Number(event.target.value))} className="w-24 accent-amber-600" aria-label="Fine-tune pen thickness" />
                        <span className="w-12 tabular-nums">~{visiblePx(penWidth)}px</span>
                      </label>
                    )}
                  </>
                )}
                {hint && <span className="text-xs text-stone-500">{hint}</span>}
              </>
            ) : selectedBlocks.length ? (
              <>
                {single && single.type !== "image" && (
                  <>
                    <span className="text-[11px] font-semibold text-stone-500">Fill</span>
                    <Swatches colors={single.type === "sticker" ? NOTE_COLORS : COLORS} value={single.type === "sticker" ? single.color : single.fill ?? "transparent"} allowNone={single.type !== "sticker"} onPick={(color) => patchBlock(single.id, single.type === "sticker" ? { color } : { fill: color })} />
                    <Divider />
                  </>
                )}
                {single && (
                  <>
                    <span className="text-[11px] font-semibold text-stone-500">Border</span>
                    <Swatches colors={COLORS} value={strokeFor(single)} allowNone onPick={(color) => patchBlock(single.id, { stroke: color, ...(single.type === "text" ? { framed: color !== "transparent" } : {}) })} />
                    <select aria-label="Border width" value={single.strokeWidth || 1} onChange={(event) => patchBlock(single.id, { strokeWidth: Number(event.target.value) })} className="rounded-md border border-stone-200 bg-white px-1 py-0.5 text-xs">
                      {[1, 2, 3, 4, 6].map((width) => <option key={width} value={width}>{width}px</option>)}
                    </select>
                    {single.type === "text" && (
                      <select aria-label="Base text size" value={single.fontSize || 16} onChange={(event) => patchBlock(single.id, { fontSize: Number(event.target.value) })} className="rounded-md border border-stone-200 bg-white px-1 py-0.5 text-xs">
                        {[12, 14, 16, 18, 20, 24, 28, 32].map((size) => <option key={size} value={size}>{size}px text</option>)}
                      </select>
                    )}
                    {single.type === "table" && (
                      <button type="button" onClick={() => patchBlock(single.id, { headerRow: !single.headerRow })} className={`rounded-md px-2 py-1 text-xs font-semibold ${single.headerRow ? "bg-amber-100 text-amber-800" : "text-stone-600 hover:bg-stone-100"}`}>Header row</button>
                    )}
                    {single.type === "shape" && (
                      <select aria-label="Shape" value={single.shapeType} onChange={(event) => patchBlock(single.id, { shapeType: event.target.value })} className="rounded-md border border-stone-200 bg-white px-1 py-0.5 text-xs">
                        {SHAPE_TYPES.map((shape) => <option key={shape.id} value={shape.id}>{shape.label}</option>)}
                      </select>
                    )}
                    <Divider />
                  </>
                )}
                {selectedBlocks.length > 1 && (
                  <>
                    <span className="text-[11px] font-semibold text-stone-500">{selectedBlocks.length} selected</span>
                    {[["left", AlignStartVertical], ["center", AlignCenterVertical], ["right", AlignEndVertical], ["top", AlignStartHorizontal], ["middle", AlignCenterHorizontal], ["bottom", AlignEndHorizontal]].map(([mode, Icon]) => (
                      <ToolButton key={mode} title={`Align ${mode}`} onClick={() => patchBlocks(alignBlocks(selectedBlocks, mode))}><Icon className="h-4 w-4" /></ToolButton>
                    ))}
                    {selectedBlocks.length > 2 && (
                      <>
                        <button type="button" onClick={() => patchBlocks(distributeBlocks(selectedBlocks, "x"))} className="rounded-md px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100">Space horizontally</button>
                        <button type="button" onClick={() => patchBlocks(distributeBlocks(selectedBlocks, "y"))} className="rounded-md px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100">Space vertically</button>
                      </>
                    )}
                    <Divider />
                  </>
                )}
                <ToolButton title="Bring to front (Ctrl+])" onClick={() => reorder(true)}><BringToFront className="h-4 w-4" /></ToolButton>
                <ToolButton title="Send to back (Ctrl+[)" onClick={() => reorder(false)}><SendToBack className="h-4 w-4" /></ToolButton>
                <ToolButton title="Duplicate (Ctrl+D)" onClick={() => duplicateSelection()}><Copy className="h-4 w-4" /></ToolButton>
                <ToolButton title="Delete (Del)" onClick={deleteSelection}><Trash2 className="h-4 w-4 text-red-500" /></ToolButton>
              </>
            ) : hint ? (
              <span className="flex items-center gap-2 text-xs font-semibold text-amber-800"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stone-900 dark:bg-amber-400 dark:text-stone-900" />{hint}<span className="font-normal text-amber-500">Esc to cancel</span></span>
            ) : null}
          </div>
        )}
      </div>

      {/* Pages */}
      <div ref={scrollRef} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-auto bg-stone-200/70" style={{ touchAction: "none", cursor: CREATION_TOOLS.includes(tool) ? "crosshair" : undefined }}>
        <div ref={zoomWrapRef} className="relative mx-auto my-6" style={{ width: A4_WIDTH * zoom, height: documentHeight * zoom }}>
          <div className="workspace-document absolute left-0 top-0" style={{ width: A4_WIDTH, height: documentHeight, transform: `scale(${zoom})`, transformOrigin: "top left" }}>
            {pages.map((page, index) => (
              <div
                key={page.id}
                ref={(element) => { if (element) pageRefs.current.set(page.id, element); else pageRefs.current.delete(page.id); }}
                data-page={index + 1}
                className={`page-${pageStyle} absolute left-0 overflow-hidden bg-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] ring-1 ring-stone-300`}
                style={{ top: index * PAGE_STEP, width: A4_WIDTH, height: A4_HEIGHT, cursor: startHere ? PLUS_CURSOR : undefined, touchAction: startHere ? "none" : undefined }}
                onPointerDown={(event) => onPagePointerDown(event, page, index)}
                onDragOver={(event) => { if (!locked && [...event.dataTransfer.types].includes("Files")) event.preventDefault(); }}
                onDrop={(event) => {
                  if (locked || !event.dataTransfer.files?.length) return;
                  event.preventDefault();
                  insertImages(event.dataTransfer.files, page.id, pagePoint(event, page.id));
                }}
              >
                {blocks.filter((block) => pageOf(block) === page.id).map(renderBlock)}

                {preview?.type === "move" && preview.pageId === page.id && preview.guides.map((guide, i) => (
                  <span key={i} data-export-ignore className="pointer-events-none absolute z-30 bg-pink-500" style={guide.axis === "x" ? { left: guide.at, top: 0, width: 1, height: A4_HEIGHT } : { top: guide.at, left: 0, height: 1, width: A4_WIDTH }} />
                ))}
                {preview?.type === "create" && tool === "shape" && preview.pageId === page.id && preview.rect && (
                  // Draw the real shape while dragging, not a box around it.
                  <span data-export-ignore className="pointer-events-none absolute z-30 opacity-70" style={{ left: preview.rect.x, top: preview.rect.y, width: Math.max(1, preview.rect.w), height: Math.max(1, preview.rect.h) }}>
                    <ShapeContent block={{ shapeType, stroke: "#2563eb", strokeWidth: 2, fill: "transparent" }} w={Math.max(1, preview.rect.w)} h={Math.max(1, preview.rect.h)} />
                  </span>
                )}
                {(preview?.type === "marquee" || (preview?.type === "create" && tool !== "shape")) && preview.pageId === page.id && preview.rect && (
                  <span data-export-ignore className={`pointer-events-none absolute z-30 border ${preview.type === "marquee" ? "border-amber-500 bg-amber-500/10" : "border-2 border-dashed border-amber-500 bg-amber-500/5"}`} style={{ left: preview.rect.x, top: preview.rect.y, width: preview.rect.w, height: preview.rect.h }} />
                )}
                <span data-export-ignore className="pointer-events-none absolute bottom-4 left-0 right-0 select-none text-center text-[10px] font-medium text-stone-400">{index + 1}</span>
              </div>
            ))}

            <InkCanvas
              ref={inkRef}
              elements={ink}
              onCommit={commitInk}
              tool={tool}
              color={tool === "highlighter" ? highlightColor : inkColor}
              width={tool === "highlighter" ? highlighterWidth : penWidth}
              zoom={zoom}
              documentHeight={documentHeight}
              locked={locked}
            />
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex h-11 flex-none items-center justify-between border-t border-stone-200 bg-white px-3 text-sm text-stone-600">
        <div className="flex items-center gap-1">
          <ToolButton title="Previous page" onClick={() => scrollToPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0}><ChevronLeft className="h-4 w-4" /></ToolButton>
          <span className="min-w-[70px] text-center text-xs font-semibold">Page {currentPage + 1} / {pages.length}</span>
          <ToolButton title="Next page" onClick={() => scrollToPage(Math.min(pages.length - 1, currentPage + 1))} disabled={currentPage >= pages.length - 1}><ChevronRight className="h-4 w-4" /></ToolButton>
          <Divider />
          <ToolButton title="Add a page after this one" onClick={addPage} disabled={locked}><Plus className="h-4 w-4" /><span className="hidden sm:inline text-xs">Page</span></ToolButton>
          <ToolButton title="Move page up" onClick={() => shiftPage(-1)} disabled={locked || currentPage === 0}><ArrowUp className="h-4 w-4" /></ToolButton>
          <ToolButton title="Move page down" onClick={() => shiftPage(1)} disabled={locked || currentPage >= pages.length - 1}><ArrowDown className="h-4 w-4" /></ToolButton>
          <ToolButton title="Delete this page" onClick={removePage} disabled={locked || pages.length <= 1}><Trash2 className="h-4 w-4" /></ToolButton>
        </div>
        <div className="flex items-center gap-1">
          <ToolButton title="Zoom out" onClick={() => setZoom((value) => Math.max(0.25, Math.round((value - 0.1) * 100) / 100))}><Minus className="h-4 w-4" /></ToolButton>
          <input type="range" min="25" max="300" step="5" value={Math.round(zoom * 100)} onChange={(event) => setZoom(Number(event.target.value) / 100)} className="w-24 accent-amber-600" aria-label="Zoom" />
          <ToolButton title="Zoom in" onClick={() => setZoom((value) => Math.min(3, Math.round((value + 0.1) * 100) / 100))}><Plus className="h-4 w-4" /></ToolButton>
          <span className="w-10 text-right text-xs font-semibold">{Math.round(zoom * 100)}%</span>
          <ToolButton title="Fit width" onClick={() => { const width = scrollRef.current?.clientWidth ?? A4_WIDTH; setZoom(Math.round(Math.min(2, Math.max(0.25, (width - 48) / A4_WIDTH)) * 100) / 100); }}><Maximize2 className="h-4 w-4" /></ToolButton>
        </div>
      </div>

      {zoomBar && (
        <div data-zoombar className="fixed z-[95] flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-1 shadow-xl" style={{ left: Math.max(8, Math.min(window.innerWidth - 320, zoomBar.x - 150)), top: Math.max(8, zoomBar.y - 64) }}>
          <ToolButton title="Zoom out" onClick={() => zoomAround(zoom - 0.25, zoomBar.x, zoomBar.y)}><Minus className="h-4 w-4" /></ToolButton>
          <input type="range" min="25" max="300" step="5" value={Math.round(zoom * 100)} onChange={(event) => zoomAround(Number(event.target.value) / 100, zoomBar.x, zoomBar.y)} className="w-28 accent-amber-600" aria-label="Zoom" />
          <ToolButton title="Zoom in" onClick={() => zoomAround(zoom + 0.25, zoomBar.x, zoomBar.y)}><Plus className="h-4 w-4" /></ToolButton>
          <span className="w-10 text-center text-xs font-semibold">{Math.round(zoom * 100)}%</span>
          <ToolButton title="Close zoom" onClick={() => setZoomBar(null)}><X className="h-4 w-4" /></ToolButton>
        </div>
      )}

      {cellMenu && tableCell && (
        <div className="fixed inset-0 z-[90]" onPointerDown={() => setCellMenu(null)} onContextMenu={(event) => { event.preventDefault(); setCellMenu(null); }}>
          <div className="absolute w-48 rounded-xl border border-stone-200 bg-white p-1.5 text-sm shadow-xl" style={{ left: cellMenu.x, top: cellMenu.y }} onPointerDown={(event) => event.stopPropagation()}>
            {[
              ["Insert row above", { type: "insertRow", index: cellMenu.r }],
              ["Insert row below", { type: "insertRow", index: cellMenu.r + 1 }],
              ["Insert column left", { type: "insertCol", index: cellMenu.c }],
              ["Insert column right", { type: "insertCol", index: cellMenu.c + 1 }],
              ["Delete row", { type: "deleteRow", index: cellMenu.r }, tableCell.rows <= 1],
              ["Delete column", { type: "deleteCol", index: cellMenu.c }, tableCell.cols <= 1],
              [tableCell.headerRow ? "Remove header row" : "Make first row a header", { type: "toggleHeader" }],
            ].map(([label, change, disabled]) => (
              <button key={label} type="button" disabled={disabled} onClick={() => tableAction(change)} className="block w-full rounded-lg px-3 py-1.5 text-left text-stone-700 hover:bg-stone-50 disabled:opacity-40">{label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
