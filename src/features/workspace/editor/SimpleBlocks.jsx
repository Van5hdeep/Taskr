import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ImageOff, Loader2 } from "../../../lib/icons";
import { signedImageUrl } from "../api";

// ─── Shapes ────────────────────────────────────────────────────────────────

export const SHAPE_TYPES = [
  { id: "rectangle", label: "Rectangle" },
  { id: "rounded-rect", label: "Rounded rectangle" },
  { id: "circle", label: "Circle" },
  { id: "ellipse", label: "Ellipse" },
  { id: "triangle", label: "Triangle" },
  { id: "diamond", label: "Diamond" },
  { id: "arrow", label: "Arrow" },
  { id: "line", label: "Line" },
  { id: "text-callout", label: "Callout" },
];

export function ShapeContent({ block, w, h }) {
  const fill = block.fill || "transparent";
  const stroke = block.stroke || "#2563eb";
  const sw = block.strokeWidth || 2;
  const common = { fill, stroke, strokeWidth: sw, vectorEffect: "non-scaling-stroke" };
  const shapes = {
    rectangle: <rect x={sw / 2} y={sw / 2} width={w - sw} height={h - sw} {...common} />,
    "rounded-rect": <rect x={sw / 2} y={sw / 2} width={w - sw} height={h - sw} rx={Math.min(16, w / 4, h / 4)} {...common} />,
    circle: <circle cx={w / 2} cy={h / 2} r={Math.max(1, Math.min(w, h) / 2 - sw)} {...common} />,
    ellipse: <ellipse cx={w / 2} cy={h / 2} rx={Math.max(1, w / 2 - sw)} ry={Math.max(1, h / 2 - sw)} {...common} />,
    triangle: <polygon points={`${w / 2},${sw} ${w - sw},${h - sw} ${sw},${h - sw}`} {...common} />,
    diamond: <polygon points={`${w / 2},${sw} ${w - sw},${h / 2} ${w / 2},${h - sw} ${sw},${h / 2}`} {...common} />,
    arrow: (
      <>
        <line x1={sw} y1={h / 2} x2={w * 0.68} y2={h / 2} {...common} fill="none" />
        <polygon points={`${w * 0.6},${sw} ${w - sw},${h / 2} ${w * 0.6},${h - sw}`} {...common} fill={fill === "transparent" ? stroke : fill} />
      </>
    ),
    line: <line x1={sw} y1={h / 2} x2={w - sw} y2={h / 2} {...common} />,
    "text-callout": (
      <>
        <rect x={sw / 2} y={sw / 2} width={w - sw} height={h * 0.72} rx={8} {...common} />
        <polygon points={`${w * 0.28},${h * 0.72} ${w * 0.38},${h - sw} ${w * 0.48},${h * 0.72}`} {...common} />
      </>
    ),
  };
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block overflow-visible">
      {shapes[block.shapeType] ?? shapes.rectangle}
    </svg>
  );
}

// ─── Sticky note ───────────────────────────────────────────────────────────

export const NOTE_COLORS = ["#fef9c3", "#dbeafe", "#dcfce7", "#fce7f3", "#f3e8ff", "#ffffff"];

export function StickerContent({ block, onCommit, readOnly }) {
  const [text, setText] = useState(block.text ?? "");
  useEffect(() => { setText(block.text ?? ""); }, [block.text]);
  return (
    <div className="flex h-full w-full flex-col p-3 shadow-[2px_4px_12px_rgba(0,0,0,0.12)]" style={{ backgroundColor: block.color || NOTE_COLORS[0], border: `${block.strokeWidth || 1}px solid ${block.stroke || "transparent"}` }}>
      <textarea
        value={text}
        readOnly={readOnly}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => { if (text !== (block.text ?? "")) onCommit({ text }); }}
        placeholder="Note…"
        className="w-full flex-1 resize-none bg-transparent text-sm font-medium text-stone-800 outline-none placeholder:text-stone-500/60"
      />
    </div>
  );
}

// ─── Image ─────────────────────────────────────────────────────────────────

/** Resolves a storage path to a short-lived signed URL (data/blob URLs pass through). */
export function useImageSource(block, previewUrl) {
  const [state, setState] = useState({ url: previewUrl ?? null, error: false });
  useEffect(() => {
    let active = true;
    if (block.assetPath) {
      signedImageUrl(block.assetPath)
        .then((url) => { if (active) setState({ url, error: false }); })
        .catch(() => { if (active) setState({ url: previewUrl ?? null, error: !previewUrl }); });
    } else if (block.src) {
      setState({ url: block.src, error: false });
    } else {
      setState({ url: previewUrl ?? null, error: false });
    }
    return () => { active = false; };
  }, [block.assetPath, block.src, previewUrl]);
  return state;
}

export function ImageContent({ block, previewUrl }) {
  const { url, error } = useImageSource(block, previewUrl);
  const uploading = !block.assetPath && !block.src;
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: block.fill || "transparent", border: `${block.strokeWidth || 1}px solid ${block.stroke || "transparent"}` }}>
      {url && <img src={url} alt={block.alt || ""} {...(block.src ? {} : { crossOrigin: "anonymous" })} draggable={false} style={{ opacity: block.opacity ?? 1 }} className="pointer-events-none h-full w-full select-none object-contain" />}
      {error && <div className="flex h-full w-full items-center justify-center bg-stone-100 text-stone-400"><ImageOff className="h-6 w-6" /></div>}
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 text-xs font-semibold text-stone-600" data-export-ignore>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…
        </div>
      )}
    </div>
  );
}

// ─── Table ─────────────────────────────────────────────────────────────────

export function resizeTable(block, change) {
  const data = block.data.map((row) => [...row]);
  let { rows, cols, height } = block;
  const rowHeight = block.height / block.rows;
  if (change.type === "insertRow") {
    data.splice(change.index, 0, Array(cols).fill(""));
    rows += 1;
    height += rowHeight;
  }
  if (change.type === "deleteRow" && rows > 1) {
    data.splice(change.index, 1);
    rows -= 1;
    height = Math.max(24, height - rowHeight);
  }
  if (change.type === "insertCol") {
    data.forEach((row) => row.splice(change.index, 0, ""));
    cols += 1;
  }
  if (change.type === "deleteCol" && cols > 1) {
    data.forEach((row) => row.splice(change.index, 1));
    cols -= 1;
  }
  return { data, rows, cols, height };
}

/** Grows a cell's textarea to fit its wrapped text. */
function fitToContent(element) {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

/**
 * Cells wrap their text onto new lines; when a cell outgrows its row, the row
 * (and the whole table block) gets taller instead of hiding the text.
 */
export function TableContent({ block, onCommit, onCellMenu, readOnly }) {
  const [draft, setDraft] = useState(block.data);
  const timer = useRef(null);
  const tableRef = useRef(null);
  useEffect(() => { setDraft(block.data); }, [block.data]);
  useEffect(() => () => clearTimeout(timer.current), []);

  useLayoutEffect(() => {
    tableRef.current?.querySelectorAll("textarea").forEach(fitToContent);
  }, [draft, block.width, block.height]);

  // Height the table needs to show every line, or null when it already fits.
  const grownHeight = () => {
    const needed = tableRef.current?.offsetHeight ?? 0;
    return needed > block.height + 1 ? Math.ceil(needed) : null;
  };

  // Narrowing the table rewraps text; keep the block tall enough for it.
  useEffect(() => {
    const height = grownHeight();
    if (height && !readOnly) onCommit({ height });
  }, [block.width]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = (data) => {
    clearTimeout(timer.current);
    const height = grownHeight();
    onCommit(height ? { data, height } : { data });
  };
  const setCell = (r, c, value) => {
    const next = draft.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row));
    setDraft(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(next), 700);
  };

  const border = `${block.strokeWidth || 1}px solid ${block.stroke || "#000000"}`;
  return (
    <table ref={tableRef} className="table-crisp h-full w-full" style={{ tableLayout: "fixed", backgroundColor: block.fill || "transparent", border }}>
      <tbody>
        {draft.map((row, r) => (
          <tr key={r}>
            {row.map((cell, c) => {
              const header = block.headerRow && r === 0;
              return (
                <td key={c} className="relative p-0 align-top" style={{ border, backgroundColor: header ? "rgba(148,163,184,0.18)" : undefined }}>
                  <textarea
                    rows={1}
                    value={cell}
                    readOnly={readOnly}
                    aria-label={`Row ${r + 1}, column ${c + 1}`}
                    onChange={(event) => { fitToContent(event.target); setCell(r, c, event.target.value); }}
                    onBlur={() => { if (draft !== block.data) commit(draft); }}
                    onContextMenu={(event) => { event.preventDefault(); onCellMenu?.(event, r, c); }}
                    onKeyDown={(event) => {
                      // Tab in the last cell adds a row, like a word processor.
                      if (event.key === "Tab" && !event.shiftKey && r === draft.length - 1 && c === row.length - 1) {
                        event.preventDefault();
                        commit(draft);
                        onCommit(resizeTable({ ...block, data: draft }, { type: "insertRow", index: draft.length }));
                      }
                    }}
                    className={`block min-h-full w-full resize-none overflow-hidden whitespace-pre-wrap break-words bg-transparent px-2 py-1 text-sm leading-snug text-stone-900 outline-none focus:bg-amber-50/60 ${header ? "font-bold" : ""}`}
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
