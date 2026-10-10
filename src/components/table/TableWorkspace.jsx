import { Excalidraw, CaptureUpdateAction } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Copy, Trash2, Undo, Redo, PaintBucket, Type as TypeIcon,
  AlignLeft, AlignCenter, AlignRight, ChevronDown, Grid, Eraser,
  PenLine, X, Underline, Italic, Bold, Trash, MousePointer2,
  Image as ImageIcon, Shapes, StickyNote, Lock, Unlock, ZoomIn, ZoomOut,
  Circle, Square, Triangle, Minus, Check, ChevronLeft, ChevronRight,
  Diamond, ArrowRight, MessageSquare, Maximize2, Minimize2,
  Palette, GripVertical, Highlighter
} from "lucide-react";
import WorkspaceSaveModal from "../WorkspaceSaveModal";
import SaveButton from "../ui/SaveButton";

// ─── Constants ─────────────────────────────────────────────────────────────────

const ANNOTATION_COLORS = [
  { id: "black",  hex: "#000000" },
  { id: "blue",   hex: "#2563eb" },
  { id: "red",    hex: "#dc2626" },
  { id: "green",  hex: "#16a34a" },
  { id: "purple", hex: "#9333ea" },
  { id: "orange", hex: "#ea580c" },
];

const TEXT_HIGHLIGHT_COLORS = [
  { id: "yellow", hex: "#fef08a", label: "Yellow" },
  { id: "green", hex: "#bbf7d0", label: "Green" },
  { id: "blue", hex: "#bfdbfe", label: "Blue" },
  { id: "pink", hex: "#fbcfe8", label: "Pink" },
  { id: "purple", hex: "#ddd6fe", label: "Purple" },
];

const STICKER_COLORS = [
  { id: "yellow", hex: "#fef9c3", label: "Yellow"  },
  { id: "blue",   hex: "#dbeafe", label: "Blue"    },
  { id: "green",  hex: "#dcfce7", label: "Green"   },
  { id: "pink",   hex: "#fce7f3", label: "Pink"    },
  { id: "purple", hex: "#f3e8ff", label: "Purple"  },
  { id: "white",  hex: "#ffffff", label: "White"   },
];

const SHAPE_TYPES = [
  { id: "rectangle",      label: "Rectangle",         icon: "rect" },
  { id: "rounded-rect",   label: "Rounded Rectangle", icon: "rrect" },
  { id: "circle",         label: "Circle",             icon: "circle" },
  { id: "ellipse",        label: "Ellipse",            icon: "ellipse" },
  { id: "triangle",       label: "Triangle",           icon: "tri" },
  { id: "arrow",          label: "Arrow",              icon: "arrow" },
  { id: "line",           label: "Line",               icon: "line" },
  { id: "diamond",        label: "Diamond",            icon: "diamond" },
  { id: "text-callout",   label: "Text Callout",       icon: "callout" },
];

function ShapeMenuIcon({ icon, className = "w-4 h-4" }) {
  if (icon === "rect" || icon === "rrect") return <Square className={className} style={icon === "rrect" ? { borderRadius: 3 } : undefined} />;
  if (icon === "circle" || icon === "ellipse") return <Circle className={className} style={icon === "ellipse" ? { transform: "scaleX(1.3)" } : undefined} />;
  if (icon === "tri") return <Triangle className={className} />;
  if (icon === "arrow") return <ArrowRight className={className} />;
  if (icon === "line") return <Minus className={className} />;
  if (icon === "diamond") return <Diamond className={className} />;
  if (icon === "callout") return <MessageSquare className={className} />;
  return <Shapes className={className} />;
}

const STROKE_STYLES = [
  { id: "solid",  label: "Solid",  dash: [] },
  { id: "dashed", label: "Dashed", dash: [8, 4] },
  { id: "dotted", label: "Dotted", dash: [2, 3] },
];

const ERASER_SIZES = [
  { id: "small",  label: "S", value: 10 },
  { id: "medium", label: "M", value: 25 },
  { id: "large",  label: "L", value: 45 },
];

const TABLE_SIZES = [];
for (let r = 1; r <= 8; r++) {
  for (let c = 1; c <= 8; c++) {
    TABLE_SIZES.push({ rows: r, cols: c });
  }
}

// CSS pixels at 96 DPI. Keeping the document geometry fixed makes the editor
// behave like a real sheet of paper at every zoom level.
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;
const PAGE_GAP = 28;
const PAGE_MARGIN = 40;

// ─── 8-Point Resize Handles ───────────────────────────────────────────────────

const HANDLE_POSITIONS = [
  { id: "nw", cursor: "nwse-resize", style: { top: -4, left: -4 } },
  { id: "n",  cursor: "ns-resize",   style: { top: -4, left: "50%", transform: "translateX(-50%)" } },
  { id: "ne", cursor: "nesw-resize", style: { top: -4, right: -4 } },
  { id: "e",  cursor: "ew-resize",   style: { top: "50%", right: -4, transform: "translateY(-50%)" } },
  { id: "se", cursor: "nwse-resize", style: { bottom: -4, right: -4 } },
  { id: "s",  cursor: "ns-resize",   style: { bottom: -4, left: "50%", transform: "translateX(-50%)" } },
  { id: "sw", cursor: "nesw-resize", style: { bottom: -4, left: -4 } },
  { id: "w",  cursor: "ew-resize",   style: { top: "50%", left: -4, transform: "translateY(-50%)" } },
];

function ResizeHandles({ onResizeStart }) {
  return HANDLE_POSITIONS.map(h => (
    <div
      key={h.id}
      className="resize-handle"
      style={{ ...h.style, cursor: h.cursor, position: "absolute", width: 12, height: 12, zIndex: 30 }}
      onPointerDown={e => { e.stopPropagation(); onResizeStart(e, h.id); }}
    >
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: 6, height: 6, background: "white", border: "1.5px solid #2563eb", borderRadius: 0
      }} />
    </div>
  ));
}

// ─── Draggable + Resizable Hook ────────────────────────────────────────────────

function useDraggableResizable(initialX, initialY, initialW, initialH, zoom, isLocked, onUpdate) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ w: initialW, h: initialH });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ mode: null, startMouse: {x:0,y:0}, startPos: {x:0,y:0}, startSize: {w:0,h:0}, handleId: null });

  const handleDragStart = useCallback((e) => {
    if (isLocked) return;
    e.stopPropagation();
    setIsDragging(true);
    dragRef.current = {
      mode: "drag", startMouse: { x: e.clientX, y: e.clientY },
      startPos: { ...pos }, startSize: { ...size }, handleId: null
    };
    e.target.setPointerCapture(e.pointerId);
  }, [isLocked, pos, size]);

  const handleResizeStart = useCallback((e, handleId) => {
    if (isLocked) return;
    e.stopPropagation();
    setIsDragging(true);
    dragRef.current = {
      mode: "resize", startMouse: { x: e.clientX, y: e.clientY },
      startPos: { ...pos }, startSize: { ...size }, handleId
    };
    e.target.setPointerCapture(e.pointerId);
  }, [isLocked, pos, size]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging || isLocked) return;
    const ref = dragRef.current;
    const dx = (e.clientX - ref.startMouse.x) / zoom;
    const dy = (e.clientY - ref.startMouse.y) / zoom;

    if (ref.mode === "drag") {
      const newX = ref.startPos.x + dx;
      const newY = ref.startPos.y + dy;
      setPos({ x: newX, y: newY });
    } else if (ref.mode === "resize") {
      let newX = ref.startPos.x, newY = ref.startPos.y;
      let newW = ref.startSize.w, newH = ref.startSize.h;
      const h = ref.handleId;
      if (h.includes("e")) newW = Math.max(30, ref.startSize.w + dx);
      if (h.includes("w")) { newW = Math.max(30, ref.startSize.w - dx); newX = ref.startPos.x + dx; }
      if (h.includes("s")) newH = Math.max(20, ref.startSize.h + dy);
      if (h.includes("n")) { newH = Math.max(20, ref.startSize.h - dy); newY = ref.startPos.y + dy; }
      setPos({ x: newX, y: newY });
      setSize({ w: newW, h: newH });
    }
  }, [isDragging, isLocked, zoom]);

  const handlePointerUp = useCallback((e) => {
    if (!isDragging) return;
    setIsDragging(false);
    try { e.target.releasePointerCapture(e.pointerId); } catch {}
    if (onUpdate) onUpdate(pos.x, pos.y, size.w, size.h);
  }, [isDragging, pos, size, onUpdate]);

  const syncPos = (x, y, w, h) => { setPos({ x, y }); setSize({ w, h }); };

  return { pos, size, isDragging, handleDragStart, handleResizeStart, handlePointerMove, handlePointerUp, syncPos };
}

// ─── Base Block Container ──────────────────────────────────────────────────────

function BaseBlock({ block, children, isActive, isLocked, isEditMode, isContentInteractive = false, onSelect, zoom, updateBlock, onDelete, onDuplicate }) {
  const { pos, size, isDragging, handleDragStart, handleResizeStart, handlePointerMove, handlePointerUp } =
    useDraggableResizable(
      block.x, block.y, block.width || 200, block.height || 100, zoom, isLocked,
      (x, y, w, h) => updateBlock(block.id, { x, y, width: w, height: h })
    );

  const canManipulate = isEditMode && !isLocked;
  const canInteract = (canManipulate || isContentInteractive) && !isLocked;

  return (
    <div
      className={`group absolute transition-shadow ${canManipulate ? "cursor-move hover:ring-1 hover:ring-blue-300" : isContentInteractive ? "cursor-text" : "pointer-events-none"} ${isDragging ? "shadow-2xl z-50 opacity-90" : "z-10"} ${isActive && canInteract ? "block-selected ring-2 ring-blue-500" : ""}`}
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h, touchAction: "none" }}
      onPointerDown={e => {
        if (!canManipulate) return;
        onSelect(block.id);
        // Text and table fields select first so formatting applies to the
        // highlighted object. Drag them from their grip or empty surface.
        if (!["INPUT", "TEXTAREA", "SELECT", "BUTTON", "OPTION"].includes(e.target.tagName)) handleDragStart(e);
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {canManipulate && (
        <button
          type="button"
          aria-label="Drag object"
          title="Drag object"
          onPointerDown={e => { e.stopPropagation(); onSelect(block.id); handleDragStart(e); }}
          className={`absolute -top-7 left-1/2 z-[60] flex h-6 w-8 -translate-x-1/2 cursor-grab items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition-opacity active:cursor-grabbing ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className={canInteract ? "pointer-events-auto" : ""} style={{ width: "100%", height: "100%" }}>
        {children}
      </div>

      {isActive && canManipulate && (
        <>
          <ResizeHandles onResizeStart={handleResizeStart} />
        </>
      )}
      {canManipulate && (
        <div className="absolute -bottom-8 left-1/2 z-50 flex -translate-x-1/2 gap-1 rounded-lg border border-slate-200 bg-white p-1 opacity-0 shadow-md transition-opacity group-hover:opacity-100">
            <button onClick={e => { e.stopPropagation(); onDuplicate(block.id); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><Copy className="w-3.5 h-3.5" /></button>
            <button onClick={e => { e.stopPropagation(); onDelete(block.id); }} className="p-1.5 hover:bg-slate-100 rounded text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}

// ─── Text Block ────────────────────────────────────────────────────────────────

function TextBlock({ block, updateBlock, isActive, isLocked, isEditMode, isTextEditing, onSelect, zoom, onDelete, onDuplicate }) {
  const [draft, setDraft] = useState(block.text || "");
  const saveTimer = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft(block.text || "");
  }, [block.id, block.text]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  useEffect(() => {
    if (!isTextEditing || isLocked) return undefined;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [block.id, isTextEditing, isLocked]);

  const saveText = (text) => {
    clearTimeout(saveTimer.current);
    updateBlock(block.id, { text });
  };

  const queueTextSave = (text) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => updateBlock(block.id, { text }), 350);
  };

  const fill = block.fill || "transparent";
  const highlight = block.highlightColor || "transparent";
  const borderColor = block.stroke || "#000000";
  const borderWidth = block.strokeWidth || 1;
  const hasBorder = block.framed || (block.stroke && block.stroke !== "transparent");

  return (
    <BaseBlock block={block} updateBlock={updateBlock} isActive={isActive} isLocked={isLocked} isEditMode={isEditMode} isContentInteractive={isTextEditing} onSelect={onSelect} zoom={zoom} onDelete={onDelete} onDuplicate={onDuplicate}>
      <div
        className="h-full w-full overflow-hidden"
        style={{
          backgroundColor: fill,
          border: hasBorder ? `${borderWidth}px solid ${borderColor}` : "1px solid transparent",
          boxSizing: "border-box"
        }}
      >
        <textarea
          ref={inputRef}
          value={draft}
          onPointerDown={e => { if (isTextEditing) e.stopPropagation(); }}
          onChange={e => { setDraft(e.target.value); queueTextSave(e.target.value); }}
          onBlur={e => saveText(e.target.value)}
          onFocus={() => onSelect(block.id)}
          onKeyDown={e => {
            if (!e.ctrlKey && !e.metaKey) return;
            const key = e.key.toLowerCase();
            if (key === "b") { e.preventDefault(); updateBlock(block.id, { bold: !block.bold }); }
            if (key === "i") { e.preventDefault(); updateBlock(block.id, { italic: !block.italic }); }
            if (key === "u") { e.preventDefault(); updateBlock(block.id, { underline: !block.underline }); }
          }}
          disabled={isLocked || !isTextEditing}
          autoFocus={isActive && isTextEditing && !isLocked}
          placeholder="Start typing…"
          className={`h-full w-full resize-none border-none bg-transparent outline-none text-slate-900 ${block.framed ? "p-3" : "p-0"}`}
          style={{
            fontSize: block.fontSize || 16,
            color: block.color || "#000",
            fontWeight: block.bold ? 700 : 400,
            fontStyle: block.italic ? "italic" : "normal",
            textDecoration: block.underline ? "underline" : "none",
            textAlign: block.align || "left",
            backgroundColor: highlight
          }}
        />
      </div>
    </BaseBlock>
  );
}

// ─── Shape Block (SVG) ─────────────────────────────────────────────────────────

function ShapeBlock({ block, updateBlock, isActive, isLocked, isEditMode, onSelect, zoom, onDelete, onDuplicate }) {
  const w = block.width || 100;
  const h = block.height || 100;
  const fill = block.fill || "transparent";
  const stroke = block.stroke || "#2563eb";
  const sw = block.strokeWidth || 2;

  const renderShape = () => {
    switch (block.shapeType) {
      case "rectangle":
        return <rect x={sw} y={sw} width={w-sw*2} height={h-sw*2} fill={fill} stroke={stroke} strokeWidth={sw} />;
      case "rounded-rect":
        return <rect x={sw} y={sw} width={w-sw*2} height={h-sw*2} rx={12} ry={12} fill={fill} stroke={stroke} strokeWidth={sw} />;
      case "circle":
        return <circle cx={w/2} cy={h/2} r={Math.min(w,h)/2 - sw} fill={fill} stroke={stroke} strokeWidth={sw} />;
      case "ellipse":
        return <ellipse cx={w/2} cy={h/2} rx={w/2-sw} ry={h/2-sw} fill={fill} stroke={stroke} strokeWidth={sw} />;
      case "triangle":
        return <polygon points={`${w/2},${sw} ${w-sw},${h-sw} ${sw},${h-sw}`} fill={fill} stroke={stroke} strokeWidth={sw} />;
      case "arrow":
        return (
          <>
            <line x1={sw} y1={h/2} x2={w*0.65} y2={h/2} stroke={stroke} strokeWidth={sw} />
            <polygon points={`${w*0.55},${sw} ${w-sw},${h/2} ${w*0.55},${h-sw}`} fill={fill} stroke={stroke} strokeWidth={sw} />
          </>
        );
      case "line":
        return <line x1={sw} y1={h/2} x2={w-sw} y2={h/2} stroke={stroke} strokeWidth={sw} />;
      case "diamond":
        return <polygon points={`${w/2},${sw} ${w-sw},${h/2} ${w/2},${h-sw} ${sw},${h/2}`} fill={fill} stroke={stroke} strokeWidth={sw} />;
      case "text-callout":
        return (
          <>
            <rect x={sw} y={sw} width={w-sw*2} height={h*0.7} rx={6} fill={fill} stroke={stroke} strokeWidth={sw} />
            <polygon points={`${w*0.3},${h*0.7} ${w*0.4},${h-sw} ${w*0.5},${h*0.7}`} fill={fill} stroke={stroke} strokeWidth={sw} />
          </>
        );
      default:
        return <rect x={sw} y={sw} width={w-sw*2} height={h-sw*2} fill={fill} stroke={stroke} strokeWidth={sw} />;
    }
  };

  return (
    <BaseBlock block={block} updateBlock={updateBlock} isActive={isActive} isLocked={isLocked} isEditMode={isEditMode} onSelect={onSelect} zoom={zoom} onDelete={onDelete} onDuplicate={onDuplicate}>
      <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
        {renderShape()}
      </svg>
    </BaseBlock>
  );
}

// ─── Sticker Block ─────────────────────────────────────────────────────────────

function StickerBlock({ block, updateBlock, isActive, isLocked, isEditMode, onSelect, zoom, onDelete, onDuplicate }) {
  const borderColor = block.stroke || "transparent";
  const borderWidth = block.strokeWidth || 1;

  return (
    <BaseBlock block={block} updateBlock={updateBlock} isActive={isActive} isLocked={isLocked} isEditMode={isEditMode} onSelect={onSelect} zoom={zoom} onDelete={onDelete} onDuplicate={onDuplicate}>
      <div
        className="w-full h-full flex flex-col"
        style={{
          backgroundColor: block.color || "#fef9c3",
          border: `${borderWidth}px solid ${borderColor}`,
          boxSizing: "border-box",
          padding: 12,
          boxShadow: "2px 4px 12px rgba(0,0,0,0.1)"
        }}
      >
        <textarea
          value={block.text || ""}
          onChange={e => updateBlock(block.id, { text: e.target.value })}
          disabled={isLocked || !isEditMode}
          className="w-full flex-1 bg-transparent outline-none resize-none text-slate-800 font-medium text-sm"
          style={{ fontFamily: "'Caveat', cursive, sans-serif" }}
        />
      </div>
    </BaseBlock>
  );
}

// ─── Table Block ───────────────────────────────────────────────────────────────

function TableBlock({ block, updateBlock, isActive, isLocked, isEditMode, onSelect, zoom, onDelete, onDuplicate }) {
  const rows = block.rows || 3;
  const cols = block.cols || 3;
  const fill = block.fill || "transparent";
  const borderColor = block.stroke || "#000000";
  const borderWidth = block.strokeWidth || 1;
  const createData = useCallback((source) => Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => source?.[r]?.[c] || "")
  ), [rows, cols]);
  const [draftData, setDraftData] = useState(() => createData(block.data));
  const saveTimer = useRef(null);

  useEffect(() => {
    setDraftData(createData(block.data));
  }, [block.id, block.data, createData]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const updateCell = (row, col, value) => {
    const nextData = draftData.map((line, r) => line.map((cell, c) => (r === row && c === col ? value : cell)));
    setDraftData(nextData);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => updateBlock(block.id, { data: nextData }), 350);
  };

  const saveTable = () => {
    clearTimeout(saveTimer.current);
    updateBlock(block.id, { data: draftData });
  };

  return (
    <BaseBlock block={block} updateBlock={updateBlock} isActive={isActive} isLocked={isLocked} isEditMode={isEditMode} onSelect={onSelect} zoom={zoom} onDelete={onDelete} onDuplicate={onDuplicate}>
      <div className="h-full w-full overflow-hidden" style={{ backgroundColor: fill }}>
        <table className="table-crisp h-full w-full" style={{ tableLayout: "fixed", backgroundColor: fill, border: `${borderWidth}px solid ${borderColor}` }}>
          <tbody>
            {Array(rows).fill(0).map((_, r) => (
              <tr key={r}>
                {Array(cols).fill(0).map((_, c) => (
                  <td key={c} className="relative m-0 p-0" style={{ backgroundColor: fill, border: `${borderWidth}px solid ${borderColor}` }}>
                    <input
                      className="w-full h-full outline-none px-2 py-1 bg-transparent text-sm"
                      value={draftData[r]?.[c] || ""}
                      onChange={e => updateCell(r, c, e.target.value)}
                      onBlur={saveTable}
                      disabled={isLocked || !isEditMode}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BaseBlock>
  );
}

// ─── Image Block ───────────────────────────────────────────────────────────────

function ImageBlock({ block, updateBlock, isActive, isLocked, isEditMode, onSelect, zoom, onDelete, onDuplicate }) {
  const borderColor = block.stroke || "transparent";
  const borderWidth = block.strokeWidth || 1;

  return (
    <BaseBlock block={block} updateBlock={updateBlock} isActive={isActive} isLocked={isLocked} isEditMode={isEditMode} onSelect={onSelect} zoom={zoom} onDelete={onDelete} onDuplicate={onDuplicate}>
      <div className="h-full w-full overflow-hidden" style={{ backgroundColor: block.fill || "transparent", border: `${borderWidth}px solid ${borderColor}`, boxSizing: "border-box" }}>
        <img
          src={block.src}
          alt="imported"
          className="h-full w-full pointer-events-none select-none object-contain"
          draggable={false}
        />
      </div>
    </BaseBlock>
  );
}

// ─── Annotation Canvas ─────────────────────────────────────────────────────────

function AnnotateCanvas({ annotations, onAddAnnotation, activeTool, strokeColor, strokeWidth, strokeStyle, eraserWidth, zoom, isLocked, canvasWidth, canvasHeight }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const livePathRef = useRef(null);
  const frameRef = useRef(null);
  const [currentPath, setCurrentPath] = useState(null);
  const pixelRatio = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2);

  useEffect(() => () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  }, []);

  const redrawLivePath = () => {
    frameRef.current = null;
    const path = livePathRef.current;
    if (path) setCurrentPath({ ...path, points: [...path.points] });
  };

  const drawPath = (ctx, path) => {
    if (!path.points?.length) return;
    const pressureWidth = (point) => {
      const pressure = Number.isFinite(point.pressure) ? point.pressure : 0.5;
      return Math.max(0.5, path.width * (0.55 + pressure * 0.9));
    };

    ctx.save();
    ctx.strokeStyle = path.color;
    ctx.fillStyle = path.color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = path.isEraser ? "destination-out" : "source-over";
    ctx.setLineDash(path.dash || []);

    if (path.points.length === 1) {
      const point = path.points[0];
      ctx.beginPath();
      ctx.arc(point.x, point.y, pressureWidth(point) / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Preserve clean dashed paths, while solid ink receives pressure-aware
    // micro-segments for the natural, high-definition pen response.
    if (path.dash?.length) {
      ctx.beginPath();
      ctx.lineWidth = path.width;
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length - 1; i++) {
        const point = path.points[i];
        const next = path.points[i + 1];
        ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
      }
      const last = path.points[path.points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    } else {
      for (let i = 1; i < path.points.length; i++) {
        const previous = path.points[i - 1];
        const point = path.points[i];
        ctx.beginPath();
        ctx.lineWidth = (pressureWidth(previous) + pressureWidth(point)) / 2;
        ctx.moveTo(previous.x, previous.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = true;

    const paths = [...annotations, ...(currentPath ? [currentPath] : [])];
    paths.forEach(path => drawPath(ctx, path));
  }, [annotations, currentPath, canvasWidth, canvasHeight, pixelRatio]);

  const getCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
      pressure: e.pointerType === "pen" && e.pressure > 0 ? e.pressure : 0.5
    };
  };

  const handlePointerDown = (e) => {
    if (isLocked || (activeTool !== "annotate" && activeTool !== "eraser")) return;
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    const dash = activeTool === "eraser" ? [] : (strokeStyle || []);
    const path = {
      color: strokeColor,
      width: activeTool === "eraser" ? eraserWidth : strokeWidth,
      isEraser: activeTool === "eraser",
      dash,
      points: [getCoords(e)]
    };
    drawingRef.current = true;
    livePathRef.current = path;
    setCurrentPath(path);
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current || !livePathRef.current) return;
    e.preventDefault();
    const pointerEvents = e.getCoalescedEvents?.() || [e];
    pointerEvents.forEach(pointerEvent => {
      const point = getCoords(pointerEvent);
      const previous = livePathRef.current.points[livePathRef.current.points.length - 1];
      if (Math.hypot(point.x - previous.x, point.y - previous.y) >= 0.25) {
        livePathRef.current.points.push(point);
      }
    });
    if (!frameRef.current) frameRef.current = requestAnimationFrame(redrawLivePath);
  };

  const handlePointerUp = (e) => {
    if (!drawingRef.current || !livePathRef.current) return;
    const path = { ...livePathRef.current, points: [...livePathRef.current.points] };
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (path.points.length > 0) onAddAnnotation(path);
    drawingRef.current = false;
    livePathRef.current = null;
    setCurrentPath(null);
    try { e.target.releasePointerCapture(e.pointerId); } catch {}
  };

  const isAnnotating = !isLocked && (activeTool === "annotate" || activeTool === "eraser");

  return (
    <canvas
      ref={canvasRef}
      width={Math.ceil(canvasWidth * pixelRatio)}
      height={Math.ceil(canvasHeight * pixelRatio)}
      className="absolute top-0 left-0 z-[2]"
      style={{
        pointerEvents: isAnnotating ? "auto" : "none",
        width: canvasWidth,
        height: canvasHeight,
        touchAction: "none",
        imageRendering: "auto",
        cursor: activeTool === "eraser" ? `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='8' fill='none' stroke='%23666' stroke-width='1'/%3E%3C/svg%3E") 12 12, crosshair` : (isAnnotating ? "crosshair" : "default")
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}

// ─── Excalidraw ink engine ────────────────────────────────────────────────────
//
// TASKR owns the surrounding document, toolbar, page system, and object UI.
// Excalidraw is deliberately mounted without its own controls so it only powers
// smooth freehand ink and erasing inside this established workspace experience.
function ExcalidrawInkLayer({ activeTool, isLocked, strokeColor, strokeWidth, strokeStyleId, onApiReady, onChange, elements, zoom, canvasHeight, onZoom }) {
  const [api, setApi] = useState(null);
  const syncing = useRef(false);
  const signature = useRef(JSON.stringify(elements));
  const initialData = useRef({ elements, appState: { viewBackgroundColor: "transparent", scrollX: 0, scrollY: 0 } });
  const isInkTool = !isLocked && (activeTool === "annotate" || activeTool === "eraser");

  useEffect(() => {
    if (!api || signature.current === JSON.stringify(elements)) return;
    syncing.current = true;
    signature.current = JSON.stringify(elements);
    api.updateScene({ elements, captureUpdate: CaptureUpdateAction.NEVER });
    syncing.current = false;
  }, [api, elements]);

  useEffect(() => {
    if (!api) return;
    api.updateScene({
      appState: {
        currentItemStrokeColor: strokeColor,
        currentItemStrokeWidth: strokeWidth,
        currentItemStrokeStyle: strokeStyleId,
        currentItemRoughness: 0,
        currentItemFillStyle: "solid",
        zoom: { value: zoom },
        scrollX: 0,
        scrollY: 0,
      },
    });
    api.setActiveTool({
      type: activeTool === "eraser" ? "eraser" : activeTool === "annotate" ? "freedraw" : "selection",
      locked: activeTool === "annotate" || activeTool === "eraser",
    });
  }, [activeTool, api, strokeColor, strokeStyleId, strokeWidth, zoom]);

  return (
    <div
      className="taskr-excalidraw-ink absolute inset-0 z-[25]"
      style={{ pointerEvents: isInkTool ? "auto" : "none", width: A4_WIDTH * zoom, height: canvasHeight * zoom, transform: `scale(${1 / zoom})`, transformOrigin: "top left" }}
      aria-label="Annotation layer"
      onWheelCapture={event => {
        event.stopPropagation();
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          onZoom(Math.min(3, Math.max(0.25, zoom - event.deltaY * 0.002)));
        }
      }}
    >
      <Excalidraw
        excalidrawAPI={(instance) => {
          setApi(instance);
          onApiReady(instance);
        }}
        initialData={initialData.current}
        onChange={(next, state) => {
          if (syncing.current || state.cursorButton === "down") return;
          const nextSignature = JSON.stringify(next);
          if (nextSignature === signature.current) return;
          signature.current = nextSignature;
          onChange(JSON.parse(nextSignature));
        }}
        theme="light"
        zenModeEnabled
        autoFocus={false}
        handleKeyboardGlobally={false}
        UIOptions={{
          tools: { image: false },
          canvasActions: {
            changeViewBackgroundColor: false,
            clearCanvas: false,
            export: false,
            loadScene: false,
            saveToActiveFile: false,
            saveAsImage: false,
            toggleTheme: false,
          },
        }}
      />
    </div>
  );
}

// ─── Grid Size Picker (hover-based like Office) ────────────────────────────────

function GridSizePicker({ onSelect, onClose }) {
  const [hover, setHover] = useState({ r: 0, c: 0 });
  const maxR = 8, maxC = 8;

  return (
    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg p-3 z-[60]" onMouseLeave={onClose}>
      <div className="text-xs font-semibold text-slate-500 mb-2">{hover.r > 0 ? `${hover.r} × ${hover.c} Table` : "Select size"}</div>
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${maxC}, 1fr)` }}>
        {Array(maxR).fill(0).map((_, r) =>
          Array(maxC).fill(0).map((_, c) => (
            <div
              key={`${r}-${c}`}
              className={`w-5 h-5 border rounded-sm cursor-pointer transition-colors ${r < hover.r && c < hover.c ? "bg-blue-500 border-blue-500" : "bg-white border-slate-300 hover:border-blue-300"}`}
              onMouseEnter={() => setHover({ r: r + 1, c: c + 1 })}
              onClick={() => { onSelect(r + 1, c + 1); onClose(); }}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Fill Dropdown ─────────────────────────────────────────────────────────────

function FillDropdown({ activeBlockId, currentBlocks, updateBlock, onClose }) {
  const block = currentBlocks.find(b => b.id === activeBlockId);

  if (!block) {
    return (
      <div className="absolute left-0 top-full z-[60] mt-1 w-56 rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
        <p className="text-xs font-medium leading-relaxed text-slate-500">Select a text box, table, shape, sticker, or image before choosing its fill or border.</p>
      </div>
    );
  }

  const fillKey = block.type === "sticker" ? "color" : "fill";
  const fillValue = block[fillKey] || "transparent";
  const borderValue = block.stroke ?? (block.type === "table" || block.framed ? "#000000" : "transparent");
  const applyFill = (color) => updateBlock(block.id, { [fillKey]: color });
  const applyBorder = (color) => updateBlock(block.id, { stroke: color });

  return (
    <div className="absolute left-0 top-full z-[60] mt-1 w-60 rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-600">Fill &amp; border</div>
        <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Close"><X className="h-3.5 w-3.5" /></button>
      </div>

      <div className="mb-2 text-[11px] font-medium text-slate-500">Fill color</div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => applyFill("transparent")}
          className={`flex h-7 w-7 items-center justify-center rounded border text-xs text-slate-400 transition-transform hover:scale-110 hover:bg-slate-50 ${fillValue === "transparent" ? "border-blue-500 ring-2 ring-blue-300 ring-offset-1" : "border-slate-300"}`}
          title="No fill"
        >
          <X className="w-3 h-3" />
        </button>
        {ANNOTATION_COLORS.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => applyFill(c.hex)}
            className={`h-7 w-7 rounded border transition-transform hover:scale-110 ${fillValue === c.hex ? "border-white ring-2 ring-blue-400 ring-offset-1" : "border-slate-300"}`}
            style={{ backgroundColor: c.hex }}
            title={c.id}
          />
        ))}
      </div>

      <div className="mb-2 mt-4 text-[11px] font-medium text-slate-500">Border color</div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => applyBorder("transparent")}
          className={`flex h-7 w-7 items-center justify-center rounded border text-xs text-slate-400 transition-transform hover:scale-110 hover:bg-slate-50 ${borderValue === "transparent" ? "border-blue-500 ring-2 ring-blue-300 ring-offset-1" : "border-slate-300"}`}
          title="No border"
        >
          <X className="h-3 w-3" />
        </button>
        {ANNOTATION_COLORS.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => applyBorder(c.hex)}
            className={`h-7 w-7 rounded border transition-transform hover:scale-110 ${borderValue === c.hex ? "border-white ring-2 ring-blue-400 ring-offset-1" : "border-slate-300"}`}
            style={{ backgroundColor: c.hex }}
            title={c.id}
          />
        ))}
      </div>

      <div className="mb-2 mt-4 text-[11px] font-medium text-slate-500">Border thickness</div>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3].map(width => (
          <button
            key={width}
            type="button"
            onClick={() => updateBlock(block.id, { strokeWidth: width })}
            className={`flex h-7 min-w-8 items-center justify-center rounded px-2 text-xs font-semibold transition-colors ${(block.strokeWidth || 1) === width ? "bg-blue-100 text-blue-700" : "text-slate-500 hover:bg-slate-100"}`}
            title={`${width}px border`}
          >
            {width}px
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Primary Toolbar ───────────────────────────────────────────────────────────

function ToolbarButton({ active, onClick, title, children, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${active ? "bg-blue-600 text-white shadow-sm" : "hover:bg-slate-100 text-slate-600"} ${className}`}
      title={title}
    >
      {children}
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function TableWorkspace({ t, dark, onSave, userId }) {
  const storageKey = `taskr_workspace_document_${userId || "local"}`;
  const [savedDocument] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "null"); } catch { return null; }
  });
  // ─── History (Undo/Redo) ─────────────────────────────────────────────
  const [history, setHistory] = useState([{ blocks: savedDocument?.blocks || [], annotations: savedDocument?.annotations || [], ink: savedDocument?.ink || [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentBlocks = history[historyIndex].blocks;
  const currentAnnotations = history[historyIndex].annotations;
  const currentInk = history[historyIndex].ink;

  const pushState = useCallback((newBlocks, newAnnotations, ink = currentInk) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const next = [...trimmed, { blocks: newBlocks, annotations: newAnnotations, ink }];
      // Keep history bounded
      if (next.length > 60) next.shift();
      return next;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 59));
  }, [historyIndex, currentInk]);

  const undo = () => { if (historyIndex > 0) setHistoryIndex(historyIndex - 1); };
  const redo = () => { if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1); };

  // ─── Tool state ──────────────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState("select");
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [pendingShapeType, setPendingShapeType] = useState(null);
  const [pendingTableSize, setPendingTableSize] = useState(null);
  const [draftBlock, setDraftBlock] = useState(null);
  const creationRef = useRef(null);

  // Annotation state
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2.0);
  const [strokeStyleId, setStrokeStyleId] = useState("solid");
  const strokeDash = STROKE_STYLES.find(s => s.id === strokeStyleId)?.dash || [];

  // Eraser state
  const [eraserWidth, setEraserWidth] = useState(25);
  // Excalidraw owns the live ink scene. Keeping it in a ref prevents a full
  // document rerender for every pressure sample while the user is drawing.
  const inkApiRef = useRef(null);
  const inkElementsRef = useRef([]);

  // Zoom
  const [zoom, setZoom] = useState(1);
  const workspaceRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Pages are a vertically stacked A4 document rather than a single endless
  // board. The ref lets insertion create a page immediately, before React's
  // state update has rendered it.
  const [pages, setPages] = useState(savedDocument?.pages?.length ? savedDocument.pages : [{ id: "page-1" }]);
  const pagesRef = useRef(pages);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // UI state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [workspaceTitle, setWorkspaceTitle] = useState(savedDocument?.title || "Untitled Document");
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify({ blocks: currentBlocks, annotations: currentAnnotations, ink: currentInk, pages, title: workspaceTitle })); }
    catch { /* Save can be retried after browser storage is freed. */ }
  }, [storageKey, currentBlocks, currentAnnotations, currentInk, pages, workspaceTitle]);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const titleInputRef = useRef(null);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showQuickShapeMenu, setShowQuickShapeMenu] = useState(false);
  const [showStickerMenu, setShowStickerMenu] = useState(false);
  const [showFillMenu, setShowFillMenu] = useState(false);
  const [showTextHighlightMenu, setShowTextHighlightMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [copiedBlock, setCopiedBlock] = useState(null);

  // Text formatting state for active text block
  const activeBlock = currentBlocks.find(b => b.id === activeBlockId);

  // A freshly drawn text box can remain selected while the Text tool stays on,
  // so the user can type and format it without losing the active creation tool.
  // Other creation modes keep objects inactive until Select is chosen.
  useEffect(() => {
    if (!["select", "textbox"].includes(activeTool)) setActiveBlockId(null);
  }, [activeTool]);

  const documentHeight = pages.length * A4_HEIGHT + Math.max(0, pages.length - 1) * PAGE_GAP;

  const ensurePage = useCallback((pageIndex) => {
    while (pagesRef.current.length <= pageIndex) {
      pagesRef.current = [...pagesRef.current, { id: `page-${crypto.randomUUID()}` }];
    }
    setPages(pagesRef.current);
    return pagesRef.current[pageIndex];
  }, []);

  const getPagePosition = useCallback((documentY, blockHeight = 0) => {
    const pageStep = A4_HEIGHT + PAGE_GAP;
    let pageIndex = Math.max(0, Math.floor(documentY / pageStep));
    let y = documentY - pageIndex * pageStep;

    // A click in the inter-page gap or too close to a paper edge begins on a
    // fresh page instead of creating a partially hidden block.
    if (y > A4_HEIGHT - PAGE_MARGIN || y + blockHeight > A4_HEIGHT - PAGE_MARGIN) {
      pageIndex += 1;
      y = PAGE_MARGIN;
    } else {
      y = Math.max(PAGE_MARGIN, y);
    }

    return { page: ensurePage(pageIndex), pageIndex, y };
  }, [ensurePage]);

  // ─── Zoom with Ctrl+Wheel ─────────────────────────────────────────────
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.002;
        setZoom(prev => {
          const newZ = Math.min(Math.max(prev + delta, 0.25), 3);
          return Math.round(newZ * 100) / 100;
        });
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // ─── Close menus on outside click ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest(".dropdown-menu")) {
        setShowTableMenu(false);
        setShowShapeMenu(false);
        setShowQuickShapeMenu(false);
        setShowStickerMenu(false);
        setShowFillMenu(false);
        setShowTextHighlightMenu(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  // ─── Keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const isEditingField = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      if (isEditingField) return;
      if (e.ctrlKey && e.key === "z") { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === "y") { e.preventDefault(); redo(); }
      if (e.ctrlKey && e.key.toLowerCase() === "c" && activeBlockId) {
        const block = currentBlocks.find(item => item.id === activeBlockId);
        if (block) { e.preventDefault(); setCopiedBlock(JSON.parse(JSON.stringify(block))); }
      }
      if (e.ctrlKey && e.key.toLowerCase() === "v" && copiedBlock) {
        e.preventDefault();
        const pasted = { ...JSON.parse(JSON.stringify(copiedBlock)), id: crypto.randomUUID(), x: copiedBlock.x + 24, y: copiedBlock.y + 24 };
        pushState([...currentBlocks, pasted], currentAnnotations);
        setActiveBlockId(pasted.id);
      }
      if (e.ctrlKey && e.key.toLowerCase() === "d" && activeBlockId && !isEditingField) { e.preventDefault(); duplicateBlock(activeBlockId); }
      if (e.key === "Delete" && activeBlockId) { deleteBlock(activeBlockId); }
      if (e.key === "Escape") { setActiveBlockId(null); setActiveTool("select"); setPendingShapeType(null); setPendingTableSize(null); setDraftBlock(null); creationRef.current = null; }
      if (e.key.toLowerCase() === "v") { setActiveTool("select"); setPendingShapeType(null); setPendingTableSize(null); }
      // One Word-style text tool: press T, then drag the area the text box
      // should occupy. A simple click still creates a useful default box.
      if (e.key.toLowerCase() === "t" || e.key.toLowerCase() === "b") { setActiveBlockId(null); setActiveTool("textbox"); setPendingShapeType(null); setPendingTableSize(null); }
      if (e.key.toLowerCase() === "r") { setActiveBlockId(null); setActiveTool("shape"); setPendingShapeType("rectangle"); setPendingTableSize(null); }
      if (activeBlockId && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        const block = currentBlocks.find(item => item.id === activeBlockId);
        if (!block) return;
        e.preventDefault();
        const amount = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -amount : e.key === "ArrowRight" ? amount : 0;
        const dy = e.key === "ArrowUp" ? -amount : e.key === "ArrowDown" ? amount : 0;
        updateBlock(block.id, { x: block.x + dx, y: block.y + dy });
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [activeBlockId, historyIndex, copiedBlock]);

  // ─── Canvas insertion: text boxes, tables, and shapes are drawn from an
  // anchor point so their first size is deliberate. ───────────────────────
  const getWorkspacePoint = (event) => {
    const rect = workspaceRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: (event.clientX - rect.left) / zoom,
      documentY: (event.clientY - rect.top) / zoom
    };
  };

  const handleWorkspacePointerDown = (event) => {
    if (isLocked) return;
    const point = getWorkspacePoint(event);
    if (!point) return;

    const isDrawingBlock = activeTool === "textbox" || (activeTool === "shape" && pendingShapeType) || (activeTool === "table" && pendingTableSize);
    if (isDrawingBlock) {
      const pagePosition = getPagePosition(point.documentY, 0);
      const origin = {
        x: Math.min(Math.max(PAGE_MARGIN, point.x), A4_WIDTH - PAGE_MARGIN),
        y: pagePosition.y
      };
      const block = activeTool === "textbox"
        ? { id: crypto.randomUUID(), type: "text", framed: true, pageId: pagePosition.page.id, x: origin.x, y: origin.y, text: "", width: 2, height: 2, fontSize: 16, fill: "transparent", stroke: "#000000", strokeWidth: 1 }
        : activeTool === "table"
          ? { id: crypto.randomUUID(), type: "table", pageId: pagePosition.page.id, x: origin.x, y: origin.y, rows: pendingTableSize.rows, cols: pendingTableSize.cols, data: [], width: 2, height: 2, fill: "transparent", stroke: "#000000", strokeWidth: 1 }
          : { id: crypto.randomUUID(), type: "shape", shapeType: pendingShapeType, pageId: pagePosition.page.id, x: origin.x, y: origin.y, width: 2, height: 2, fill: "transparent", stroke: strokeColor, strokeWidth };

      creationRef.current = { block, origin, pageIndex: pagePosition.pageIndex };
      setDraftBlock(block);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (activeTool === "select" && (event.target === workspaceRef.current || event.target.dataset.workspacePage)) {
      setActiveBlockId(null);
    }
  };

  const handleWorkspacePointerMove = (event) => {
    const creation = creationRef.current;
    if (!creation) return;
    const point = getWorkspacePoint(event);
    if (!point) return;

    const pageY = Math.min(
      A4_HEIGHT - PAGE_MARGIN,
      Math.max(PAGE_MARGIN, point.documentY - creation.pageIndex * (A4_HEIGHT + PAGE_GAP))
    );
    const pageX = Math.min(A4_WIDTH - PAGE_MARGIN, Math.max(PAGE_MARGIN, point.x));
    const nextBlock = {
      ...creation.block,
      x: Math.min(creation.origin.x, pageX),
      y: Math.min(creation.origin.y, pageY),
      width: Math.max(2, Math.abs(pageX - creation.origin.x)),
      height: Math.max(2, Math.abs(pageY - creation.origin.y))
    };
    creation.block = nextBlock;
    setDraftBlock(nextBlock);
  };

  const handleWorkspacePointerUp = (event) => {
    const creation = creationRef.current;
    if (!creation) return;
    creationRef.current = null;
    setDraftBlock(null);
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}

    const minWidth = creation.block.type === "text" ? 140 : creation.block.type === "table" ? Math.max(96, creation.block.cols * 48) : 32;
    const minHeight = creation.block.type === "text" ? 56 : creation.block.type === "table" ? Math.max(32, creation.block.rows * 28) : 32;
    const block = { ...creation.block, width: Math.max(minWidth, creation.block.width), height: Math.max(minHeight, creation.block.height) };
    pushState([...currentBlocks, block], currentAnnotations);
    setActiveBlockId(block.type === "text" ? block.id : null);
    setCurrentPageIndex(creation.pageIndex);
    // Keep the chosen tool and its dimensions/type armed for repeated insertion.
    // The user explicitly moves back to Select when they want to manipulate
    // existing objects instead of adding more of the current tool.
  };

  // ─── Block CRUD ──────────────────────────────────────────────────────
  const updateBlock = useCallback((id, updates) => {
    pushState(currentBlocks.map(b => b.id === id ? { ...b, ...updates } : b), currentAnnotations);
  }, [currentBlocks, currentAnnotations, pushState]);

  const deleteBlock = useCallback((id) => {
    pushState(currentBlocks.filter(b => b.id !== id), currentAnnotations);
    if (activeBlockId === id) setActiveBlockId(null);
  }, [currentBlocks, currentAnnotations, activeBlockId, pushState]);

  const duplicateBlock = useCallback((id) => {
    const block = currentBlocks.find(b => b.id === id);
    if (!block) return;
    const newBlock = JSON.parse(JSON.stringify(block));
    newBlock.id = crypto.randomUUID();
    newBlock.x += 40;
    newBlock.y += 40;
    pushState([...currentBlocks, newBlock], currentAnnotations);
    setActiveBlockId(newBlock.id);
  }, [currentBlocks, currentAnnotations, pushState]);

  // ─── Add helpers ─────────────────────────────────────────────────────
  const getViewportCenter = () => {
    const el = scrollContainerRef.current;
    const workspace = workspaceRef.current;
    if (!el || !workspace) return { x: A4_WIDTH / 2, y: A4_HEIGHT / 2 };
    const viewport = el.getBoundingClientRect();
    const document = workspace.getBoundingClientRect();
    return {
      x: (viewport.left + viewport.width / 2 - document.left) / zoom,
      y: (viewport.top + viewport.height / 2 - document.top) / zoom
    };
  };

  const armTable = (r, c) => {
    setPendingTableSize({ rows: r, cols: c });
    setPendingShapeType(null);
    setActiveBlockId(null);
    setShowTableMenu(false);
    setActiveTool("table");
  };

  const addShape = (shapeType) => {
    const { x, y } = getViewportCenter();
    const id = crypto.randomUUID();
    pushState([...currentBlocks, { id, type: "shape", shapeType, x: x - 50, y: y - 50, width: 120, height: 100, fill: "transparent", stroke: strokeColor, strokeWidth }], currentAnnotations);
    setActiveBlockId(null);
    setShowShapeMenu(false);
  };

  const addSticker = (color) => {
    const { x, y } = getViewportCenter();
    const id = crypto.randomUUID();
    pushState([...currentBlocks, { id, type: "sticker", color, x: x - 90, y: y - 90, text: "", width: 180, height: 180 }], currentAnnotations);
    setActiveBlockId(id);
    setShowStickerMenu(false);
  };

  const handleImageImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const { x, y } = getViewportCenter();
        const id = crypto.randomUUID();
        pushState([...currentBlocks, { id, type: "image", src: ev.target.result, x: x - 150, y: y - 100, width: 300, height: 200 }], currentAnnotations);
        setActiveBlockId(id);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleClearWorkspace = () => {
    setShowClearConfirm(true);
  };

  const confirmClearWorkspace = () => {
    pushState([], [], []);
    inkElementsRef.current = [];
    setActiveBlockId(null);
    const firstPage = { id: `page-${crypto.randomUUID()}` };
    pagesRef.current = [firstPage];
    setPages([firstPage]);
    setCurrentPageIndex(0);
    requestAnimationFrame(() => scrollToPage(0));
    setShowClearConfirm(false);
  };

  // ─── Page management ─────────────────────────────────────────────────
  const addPage = () => {
    const page = ensurePage(pagesRef.current.length);
    const nextIndex = pagesRef.current.findIndex(item => item.id === page.id);
    setCurrentPageIndex(nextIndex);
    requestAnimationFrame(() => scrollToPage(nextIndex));
  };
  const deletePage = () => {
    if (pages.length <= 1) return;
    const pageToDelete = pages[currentPageIndex];
    const nextPages = pages.filter((_, i) => i !== currentPageIndex);
    pagesRef.current = nextPages;
    setPages(nextPages);
    pushState(currentBlocks.filter(block => block.pageId !== pageToDelete.id), currentAnnotations);
    const nextIndex = Math.max(0, currentPageIndex - 1);
    setCurrentPageIndex(nextIndex);
    requestAnimationFrame(() => scrollToPage(nextIndex));
  };

  const scrollToPage = (pageIndex) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: pageIndex * (A4_HEIGHT + PAGE_GAP) * zoom, behavior: "smooth" });
  };

  const handleDocumentScroll = (event) => {
    const el = event.currentTarget;
    const pageStep = (A4_HEIGHT + PAGE_GAP) * zoom;
    setCurrentPageIndex(Math.min(pagesRef.current.length - 1, Math.max(0, Math.round(el.scrollTop / pageStep))));

    // Reaching the end of the document is the natural "next sheet" action.
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 96) {
      ensurePage(pagesRef.current.length);
    }
  };

  // ─── Determine secondary toolbar visibility ──────────────────────────
  const showAnnotateToolbar = activeTool === "annotate";
  const showEraserToolbar = activeTool === "eraser";
  const showTextToolbar = activeBlock?.type === "text" && ["select", "textbox"].includes(activeTool);
  const showSecondaryToolbar = showAnnotateToolbar || showEraserToolbar || showTextToolbar;
  const creationHint = activeTool === "textbox"
    ? "Text ready — press and drag on the paper to draw a text box."
    : activeTool === "table" && pendingTableSize
      ? `${pendingTableSize.rows} × ${pendingTableSize.cols} table ready — press and drag on the paper to set its size.`
      : activeTool === "shape" && pendingShapeType
        ? `${SHAPE_TYPES.find(shape => shape.id === pendingShapeType)?.label || "Shape"} ready — press and drag on the paper to set its size.`
        : null;

  const startTitleEditing = () => {
    if (isLocked) return;
    setIsTitleEditing(true);
    requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });
  };

  const finishTitleEditing = () => setIsTitleEditing(false);

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className={`w-full flex flex-col bg-white h-[calc(100vh-56px)] lg:h-screen ${isLocked ? "workspace-locked" : ""}`}>

      {/* ═══ TITLE BAR ═══ */}
      <div className="flex-none px-5 pt-4 pb-2 flex items-center gap-3 z-50 bg-white">
        <input
          ref={titleInputRef}
          value={workspaceTitle}
          onChange={e => setWorkspaceTitle(e.target.value)}
          onBlur={finishTitleEditing}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
            if (e.key === "Escape") { e.currentTarget.blur(); }
          }}
          readOnly={!isTitleEditing || isLocked}
          className={`text-xl font-bold text-slate-800 outline-none bg-transparent border-none flex-1 min-w-0 ${isTitleEditing ? "rounded px-2 -mx-2 ring-2 ring-blue-200" : "cursor-default"}`}
          placeholder="Document Title"
          disabled={isLocked}
        />
        <button type="button" onClick={startTitleEditing} disabled={isLocked} title="Edit document title" className="ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40">
          <PenLine className="w-4 h-4" />
          <span>Edit</span>
        </button>
      </div>

      {/* ═══ ROW 1: PRIMARY TOOLBAR ═══ */}
      <div className="flex-none px-4 z-50">
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between p-1.5 mb-1">

          {/* Left group */}
          <div className="flex items-center gap-0.5">
            {/* Undo/Redo pill */}
            <div className="flex items-center bg-slate-100 rounded-lg mr-1">
              <button onClick={undo} disabled={historyIndex === 0} className="p-2 rounded-l-lg hover:bg-slate-200 disabled:opacity-40 text-slate-600 transition-colors" title="Undo"><Undo className="w-4 h-4" /></button>
              <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-2 rounded-r-lg hover:bg-slate-200 disabled:opacity-40 text-slate-600 transition-colors" title="Redo"><Redo className="w-4 h-4" /></button>
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            {/* Table */}
            <div className="relative dropdown-menu">
              <ToolbarButton onClick={() => { setShowTableMenu(!showTableMenu); setShowQuickShapeMenu(false); setShowShapeMenu(false); setShowStickerMenu(false); setShowFillMenu(false); }} title="Choose dimensions, then drag on the page" active={showTableMenu || activeTool === "table"}>
                <Grid className="w-4 h-4" /> Table <ChevronDown className="w-3 h-3" />
              </ToolbarButton>
              {showTableMenu && <GridSizePicker onSelect={armTable} onClose={() => setShowTableMenu(false)} />}
            </div>

            {/* Text: a single Word-style draw-text-box tool. */}
            <ToolbarButton onClick={() => { setShowQuickShapeMenu(false); setPendingShapeType(null); setPendingTableSize(null); setActiveBlockId(null); setActiveTool("textbox"); }} title="Draw a text box — click for a default size or drag to size it" active={activeTool === "textbox"}>
              <TypeIcon className="w-4 h-4" strokeWidth={2.5} /> Text
            </ToolbarButton>

            <div className="relative dropdown-menu">
              <ToolbarButton onClick={() => { setShowQuickShapeMenu(!showQuickShapeMenu); setShowTableMenu(false); setShowFillMenu(false); }} title="Choose a shape, then drag on the page" active={showQuickShapeMenu || activeTool === "shape"}>
                <Shapes className="w-4 h-4" /> Shape <ChevronDown className="w-3 h-3" />
              </ToolbarButton>
              {showQuickShapeMenu && (
                <div className="absolute top-full left-0 z-[70] mt-1 grid w-52 grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
                  {SHAPE_TYPES.map(shape => (
                    <button
                      key={shape.id}
                      onClick={() => { setPendingShapeType(shape.id); setPendingTableSize(null); setActiveBlockId(null); setActiveTool("shape"); setShowQuickShapeMenu(false); }}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                    >
                      <ShapeMenuIcon icon={shape.icon} className="h-4 w-4 shrink-0" />
                      <span>{shape.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fill */}
            <div className="relative dropdown-menu">
              <ToolbarButton onClick={() => { setShowFillMenu(!showFillMenu); setShowTableMenu(false); setShowQuickShapeMenu(false); setShowShapeMenu(false); setShowStickerMenu(false); setShowTextHighlightMenu(false); }} title={activeBlock ? "Set the selected element's fill and border" : "Select an element, then set its fill and border"} active={showFillMenu}>
                <Palette className="w-4 h-4" /> Fill <ChevronDown className="w-3 h-3" />
              </ToolbarButton>
              {showFillMenu && <FillDropdown activeBlockId={activeBlockId} currentBlocks={currentBlocks} updateBlock={updateBlock} onClose={() => setShowFillMenu(false)} />}
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            {/* Annotate */}
            <ToolbarButton
              onClick={() => { setActiveBlockId(null); setActiveTool("annotate"); }}
              title="Annotate"
              active={activeTool === "annotate"}
            >
              <PenLine className="w-4 h-4" /> Annotate
            </ToolbarButton>

            {/* Eraser */}
            <ToolbarButton onClick={() => { setActiveBlockId(null); setActiveTool("eraser"); }} title="Eraser" active={activeTool === "eraser"}>
              <Eraser className="w-4 h-4" /> Eraser
            </ToolbarButton>

            {/* Select */}
            <ToolbarButton onClick={() => { setActiveTool("select"); setPendingShapeType(null); setPendingTableSize(null); setShowTextHighlightMenu(false); }} title="Select" active={activeTool === "select" && !showTextToolbar}>
              <MousePointer2 className="w-4 h-4" /> Select
            </ToolbarButton>

            <ToolbarButton onClick={() => setIsLocked(!isLocked)} title={isLocked ? "Unlock workspace" : "Lock workspace"} active={isLocked}>
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </ToolbarButton>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            {/* Clear */}
            <button onClick={handleClearWorkspace} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors" title="Clear Workspace">
              Clear Workspace
            </button>
          </div>

          {/* Right group: Save */}
          <SaveButton onClick={() => setShowSaveModal(true)} />
        </div>

        {creationHint && (
          <div className="mb-1 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
            {creationHint}
            <span className="ml-auto font-medium text-blue-500">Esc to cancel</span>
          </div>
        )}

        {/* ═══ ROW 2: CONTEXT-AWARE SECONDARY TOOLBAR ═══ */}
        {showSecondaryToolbar && (
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm flex items-center p-2 mb-1 gap-3 flex-wrap animate-[fadeIn_0.15s_ease-out]">

            {/* ── Annotation toolbar ── */}
            {showAnnotateToolbar && (
              <>
                {/* Color palette */}
                <div className="flex items-center gap-1.5">
                  {ANNOTATION_COLORS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setStrokeColor(c.hex)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${strokeColor === c.hex ? "ring-2 ring-blue-400 ring-offset-1 border-white scale-110" : "border-slate-300 hover:scale-105"}`}
                      style={{ backgroundColor: c.hex }}
                      title={c.id}
                    />
                  ))}
                </div>

                <div className="w-px h-6 bg-slate-200" />

                {/* Ink style */}
                <div className="flex items-center gap-1">
                  {STROKE_STYLES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setStrokeStyleId(s.id)}
                      className={`p-2 rounded-lg transition-colors ${strokeStyleId === s.id ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100 text-slate-500"}`}
                      title={s.label}
                    >
                      <svg width="24" height="6" viewBox="0 0 24 6">
                        <line x1="0" y1="3" x2="24" y2="3" stroke="currentColor" strokeWidth="2"
                          strokeDasharray={s.id === "dashed" ? "6,3" : s.id === "dotted" ? "2,3" : "none"} />
                      </svg>
                    </button>
                  ))}
                </div>

                <div className="w-px h-6 bg-slate-200" />

                {/* Stroke thickness slider */}
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.1"
                    value={strokeWidth}
                    onChange={e => setStrokeWidth(parseFloat(e.target.value))}
                    className="w-28 h-1.5 accent-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-500 w-12 text-right">{strokeWidth.toFixed(1)} px</span>
                </div>

                <div className="w-px h-6 bg-slate-200" />

                {/* Import Image */}
                <button onClick={handleImageImport} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors" title="Import Image">
                  <ImageIcon className="w-4 h-4" />
                </button>

                {/* Insert Shape dropdown */}
                <div className="relative dropdown-menu">
                  <button
                    onClick={() => { setShowShapeMenu(!showShapeMenu); setShowStickerMenu(false); }}
                    className={`flex items-center gap-1 p-2 rounded-lg transition-colors ${showShapeMenu ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100 text-slate-600"}`}
                    title="Insert Shape"
                  >
                    <Shapes className="w-4 h-4" /> <ChevronDown className="w-3 h-3" />
                  </button>
                  {showShapeMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg p-2 w-48 z-[60]">
                      <div className="text-xs font-semibold text-slate-500 mb-2">Shapes</div>
                      <div className="grid grid-cols-3 gap-1">
                        {SHAPE_TYPES.map(s => (
                          <button
                            key={s.id}
                            onClick={() => { setPendingShapeType(s.id); setPendingTableSize(null); setActiveBlockId(null); setActiveTool("shape"); setShowShapeMenu(false); }}
                            className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-100 text-slate-600 text-[10px]"
                            title={s.label}
                          >
                            <ShapeMenuIcon icon={s.icon} className="w-4 h-4" />
                            <span>{s.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Insert Sticker dropdown */}
                <div className="relative dropdown-menu">
                  <button
                    onClick={() => { setShowStickerMenu(!showStickerMenu); setShowShapeMenu(false); }}
                    className={`flex items-center gap-1 p-2 rounded-lg transition-colors ${showStickerMenu ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100 text-slate-600"}`}
                    title="Insert Sticker"
                  >
                    <StickyNote className="w-4 h-4" /> <ChevronDown className="w-3 h-3" />
                  </button>
                  {showStickerMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg p-3 z-[60]">
                      <div className="text-xs font-semibold text-slate-500 mb-2">Sticker Color</div>
                      <div className="flex gap-2">
                        {STICKER_COLORS.map(c => (
                          <button
                            key={c.id}
                            onClick={() => addSticker(c.hex)}
                            className="w-8 h-8 rounded-lg border border-slate-300 hover:scale-110 transition-transform shadow-sm"
                            style={{ backgroundColor: c.hex }}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-px h-6 bg-slate-200" />

                {/* Lock workspace */}
                <button
                  onClick={() => setIsLocked(!isLocked)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isLocked ? "bg-red-50 text-red-600 border border-red-200" : "hover:bg-slate-100 text-slate-600"}`}
                  title={isLocked ? "Unlock" : "Lock"}
                >
                  {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </button>
              </>
            )}

            {/* ── Eraser toolbar ── */}
            {showEraserToolbar && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500">Stroke eraser — drag across ink to remove whole strokes. Use Undo to restore them.</span>
              </div>
            )}

            {/* ── Text formatting toolbar ── */}
            {showTextToolbar && activeBlock && (
              <div className="flex items-center gap-2">
                {/* Font size */}
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-slate-500">Size</span>
                  <select
                    value={activeBlock.fontSize || 16}
                    onChange={e => updateBlock(activeBlock.id, { fontSize: parseInt(e.target.value) })}
                    className="px-2 py-1 rounded border border-slate-200 text-xs bg-white text-slate-700 outline-none"
                  >
                    {[10,12,14,16,18,20,24,28,32,36,48,64,72].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="w-px h-5 bg-slate-200" />

                {/* Bold */}
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => updateBlock(activeBlock.id, { bold: !activeBlock.bold })}
                  className={`p-1.5 rounded transition-colors ${activeBlock.bold ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100 text-slate-600"}`}
                  title="Apply bold to the entire selected text box"
                >
                  <Bold className="w-4 h-4" />
                </button>

                {/* Italic */}
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => updateBlock(activeBlock.id, { italic: !activeBlock.italic })}
                  className={`p-1.5 rounded transition-colors ${activeBlock.italic ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100 text-slate-600"}`}
                  title="Apply italics to the entire selected text box"
                >
                  <Italic className="w-4 h-4" />
                </button>

                {/* Underline */}
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => updateBlock(activeBlock.id, { underline: !activeBlock.underline })}
                  className={`p-1.5 rounded transition-colors ${activeBlock.underline ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100 text-slate-600"}`}
                  title="Underline"
                >
                  <Underline className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-slate-200" />

                {/* Alignment */}
                <button onClick={() => updateBlock(activeBlock.id, { align: "left" })} className={`p-1.5 rounded transition-colors ${activeBlock.align === "left" || !activeBlock.align ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100 text-slate-600"}`} title="Left"><AlignLeft className="w-4 h-4" /></button>
                <button onClick={() => updateBlock(activeBlock.id, { align: "center" })} className={`p-1.5 rounded transition-colors ${activeBlock.align === "center" ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100 text-slate-600"}`} title="Center"><AlignCenter className="w-4 h-4" /></button>
                <button onClick={() => updateBlock(activeBlock.id, { align: "right" })} className={`p-1.5 rounded transition-colors ${activeBlock.align === "right" ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100 text-slate-600"}`} title="Right"><AlignRight className="w-4 h-4" /></button>

                <div className="w-px h-5 bg-slate-200" />

                {/* Text Color */}
                <div className="flex items-center gap-1">
                  {ANNOTATION_COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => updateBlock(activeBlock.id, { color: c.hex })}
                      className={`w-5 h-5 rounded-full border transition-all ${(activeBlock.color || "#000") === c.hex ? "ring-2 ring-blue-400 ring-offset-1 border-white" : "border-slate-300 hover:scale-110"}`}
                      style={{ backgroundColor: c.hex }}
                      title={c.id}
                    />
                  ))}
                </div>

                {/* Whole-text-box highlight */}
                <div className="relative dropdown-menu">
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => setShowTextHighlightMenu(!showTextHighlightMenu)}
                    className={`rounded p-1.5 transition-colors ${showTextHighlightMenu || (activeBlock.highlightColor && activeBlock.highlightColor !== "transparent") ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}
                    title="Highlight the selected text box"
                  >
                    <Highlighter className="h-4 w-4" />
                  </button>
                  {showTextHighlightMenu && (
                    <div className="absolute right-0 top-full z-[70] mt-1 w-40 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
                      <div className="mb-2 text-[11px] font-semibold text-slate-500">Text highlight</div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => { updateBlock(activeBlock.id, { highlightColor: "transparent" }); setShowTextHighlightMenu(false); }}
                          className={`flex h-6 w-6 items-center justify-center rounded border text-slate-400 ${!activeBlock.highlightColor || activeBlock.highlightColor === "transparent" ? "border-blue-500 ring-2 ring-blue-300 ring-offset-1" : "border-slate-300 hover:bg-slate-50"}`}
                          title="No highlight"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {TEXT_HIGHLIGHT_COLORS.map(color => (
                          <button
                            key={color.id}
                            type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => { updateBlock(activeBlock.id, { highlightColor: color.hex }); setShowTextHighlightMenu(false); }}
                            className={`h-6 w-6 rounded border transition-transform hover:scale-110 ${activeBlock.highlightColor === color.hex ? "border-white ring-2 ring-blue-400 ring-offset-1" : "border-slate-300"}`}
                            style={{ backgroundColor: color.hex }}
                            title={color.label}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ WORKSPACE CANVAS AREA ═══ */}
      <div
        ref={scrollContainerRef}
        className="flex-1 w-full relative overflow-auto bg-slate-200/70"
        onScroll={handleDocumentScroll}
        style={{ cursor: ["textbox", "shape", "annotate"].includes(activeTool) ? "crosshair" : "default" }}
      >
        {/* A real A4 document stack. The outer element reserves scaled space;
            the inner document stays in unscaled page coordinates. */}
        <div
          className="relative mx-auto"
          style={{
            width: A4_WIDTH * zoom,
            minWidth: A4_WIDTH * zoom,
            minHeight: documentHeight * zoom,
            paddingTop: 20,
            paddingBottom: 20
          }}
        >
          <div
            ref={workspaceRef}
            className="workspace-document relative"
            style={{
              width: A4_WIDTH,
              height: documentHeight,
              transform: `scale(${zoom})`,
              transformOrigin: "top left"
            }}
            onPointerDown={handleWorkspacePointerDown}
            onPointerMove={handleWorkspacePointerMove}
            onPointerUp={handleWorkspacePointerUp}
            onPointerCancel={handleWorkspacePointerUp}
          >
            {pages.map((page, index) => (
              <div
                key={page.id}
                data-workspace-page="true"
                className="absolute left-0 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] ring-1 ring-slate-300"
                style={{ top: index * (A4_HEIGHT + PAGE_GAP), width: A4_WIDTH, height: A4_HEIGHT }}
              >
                <span className="absolute bottom-5 left-0 right-0 text-center text-[10px] font-medium tracking-wide text-slate-400 select-none">{index + 1}</span>
              </div>
            ))}

            {/* Existing annotations remain visible for documents that were
                already in progress. New freehand marks use the Excalidraw
                engine below, without exposing Excalidraw's own interface. */}
            <AnnotateCanvas
              annotations={currentAnnotations}
              onAddAnnotation={path => pushState(currentBlocks, [...currentAnnotations, path])}
              activeTool="legacy"
              strokeColor={strokeColor}
              strokeWidth={strokeWidth}
              strokeStyle={strokeDash}
              eraserWidth={eraserWidth}
              zoom={zoom}
              isLocked={isLocked}
              canvasWidth={A4_WIDTH}
              canvasHeight={documentHeight}
            />

            <ExcalidrawInkLayer
              elements={currentInk}
              zoom={zoom}
              canvasHeight={documentHeight}
              onZoom={setZoom}
              activeTool={activeTool}
              isLocked={isLocked}
              strokeColor={strokeColor}
              strokeWidth={strokeWidth}
              strokeStyleId={strokeStyleId}
              onApiReady={(api) => { inkApiRef.current = api; }}
              onChange={(elements) => { inkElementsRef.current = elements; pushState(currentBlocks, currentAnnotations, elements); }}
            />

            {/* Blocks */}
            {currentBlocks.map(b => {
              const pageIndex = Math.max(0, pages.findIndex(page => page.id === (b.pageId || pages[0].id)));
              const isTextEditing = b.type === "text" && activeBlockId === b.id && ["select", "textbox"].includes(activeTool);
              const props = {
                key: b.id, block: b, updateBlock, isActive: activeBlockId === b.id,
                isLocked, isEditMode: activeTool === "select", isTextEditing, onSelect: setActiveBlockId, zoom, onDelete: deleteBlock, onDuplicate: duplicateBlock
              };
              const block = b.type === "text" ? <TextBlock {...props} />
                : b.type === "shape" ? <ShapeBlock {...props} />
                : b.type === "sticker" ? <StickerBlock {...props} />
                : b.type === "table" ? <TableBlock {...props} />
                : b.type === "image" ? <ImageBlock {...props} />
                : null;
              if (!block) return null;
              return (
                <div key={b.id} className="absolute left-0" style={{ top: pageIndex * (A4_HEIGHT + PAGE_GAP), width: A4_WIDTH, height: A4_HEIGHT }}>
                  {block}
                </div>
              );
            })}

            {draftBlock && (() => {
              const pageIndex = Math.max(0, pages.findIndex(page => page.id === draftBlock.pageId));
              return (
                <div className="absolute left-0 pointer-events-none" style={{ top: pageIndex * (A4_HEIGHT + PAGE_GAP), width: A4_WIDTH, height: A4_HEIGHT }}>
                  <div
                    className="absolute border-2 border-dashed border-blue-500 bg-blue-500/5"
                    style={{ left: draftBlock.x, top: draftBlock.y, width: draftBlock.width, height: draftBlock.height }}
                  >
                    {draftBlock.type === "table" && (
                      <div
                        className="grid h-full w-full"
                        style={{ gridTemplateColumns: `repeat(${draftBlock.cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${draftBlock.rows}, minmax(0, 1fr))` }}
                      >
                        {Array.from({ length: draftBlock.rows * draftBlock.cols }, (_, index) => (
                          <span key={index} className="border border-slate-500/70" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM BAR ═══ */}
      <div className="flex-none h-11 bg-white border-t border-slate-200 px-4 flex items-center justify-between text-slate-500 text-sm z-50">
        {/* Left: Page controls */}
        <div className="flex items-center gap-2">
          <button onClick={deletePage} disabled={pages.length <= 1} className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors" title="Delete Page"><Trash2 className="w-3.5 h-3.5" /></button>
          <div className="flex items-center gap-1">
            <button onClick={() => { const index = Math.max(0, currentPageIndex - 1); setCurrentPageIndex(index); scrollToPage(index); }} disabled={currentPageIndex === 0} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-bold text-slate-700 min-w-[24px] text-center">{currentPageIndex + 1}</span>
            <button onClick={() => { const index = Math.min(pages.length - 1, currentPageIndex + 1); setCurrentPageIndex(index); scrollToPage(index); }} disabled={currentPageIndex === pages.length - 1} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
          <button onClick={addPage} className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 text-xs font-semibold text-slate-600 transition-colors">
            <Plus className="w-3 h-3" /> Add Page
          </button>
        </div>

        {/* Right: Zoom controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 mr-1">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.25))} className="p-1 hover:bg-slate-100 rounded transition-colors"><Minus className="w-3.5 h-3.5" /></button>
          <input
            type="range"
            min="25"
            max="300"
            step="5"
            value={Math.round(zoom * 100)}
            onChange={e => setZoom(parseInt(e.target.value) / 100)}
            className="w-24 h-1 accent-blue-500 cursor-pointer"
          />
          <button onClick={() => setZoom(z => Math.min(z + 0.1, 3))} className="p-1 hover:bg-slate-100 rounded transition-colors"><Plus className="w-3.5 h-3.5" /></button>
          <button onClick={() => setZoom(1)} className="p-1 hover:bg-slate-100 rounded transition-colors ml-1" title="Fit to window"><Maximize2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* ═══ SAVE MODAL ═══ */}
      {showSaveModal && (
        <WorkspaceSaveModal
          t={t}
          dark={dark}
          defaultName={workspaceTitle}
          onSave={(name) => {
            setWorkspaceTitle(name);
            if (onSave) onSave(name);
            setShowSaveModal(false);
          }}
          onCancel={() => setShowSaveModal(false)}
        />
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="clear-workspace-title">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 id="clear-workspace-title" className="text-lg font-bold text-slate-900">Clear this workspace?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">All text, tables, shapes, annotations, and pages will be removed. This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowClearConfirm(false)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100">Cancel</button>
              <button onClick={confirmClearWorkspace} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700">Clear workspace</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
