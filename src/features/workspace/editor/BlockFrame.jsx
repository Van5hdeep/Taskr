import { GripVertical } from "../../../lib/icons";

const HANDLES = [
  { id: "nw", cursor: "nwse-resize", style: { top: -5, left: -5 } },
  { id: "n", cursor: "ns-resize", style: { top: -5, left: "calc(50% - 5px)" } },
  { id: "ne", cursor: "nesw-resize", style: { top: -5, right: -5 } },
  { id: "e", cursor: "ew-resize", style: { top: "calc(50% - 5px)", right: -5 } },
  { id: "se", cursor: "nwse-resize", style: { bottom: -5, right: -5 } },
  { id: "s", cursor: "ns-resize", style: { bottom: -5, left: "calc(50% - 5px)" } },
  { id: "sw", cursor: "nesw-resize", style: { bottom: -5, left: -5 } },
  { id: "w", cursor: "ew-resize", style: { top: "calc(50% - 5px)", left: -5 } },
];

/**
 * Positions one block on its page and owns its selection chrome. All pointer
 * gestures are reported to the editor, which moves/resizes the selection.
 */
// Shapes use a faint dashed guide, so the shape itself reads as the object
// rather than looking boxed inside a rectangle.
const OUTLINES = {
  solid: { selected: "outline outline-2 outline-offset-2 outline-amber-500", hover: "hover:outline hover:outline-1 hover:outline-offset-2 hover:outline-amber-300" },
  subtle: { selected: "outline-dashed outline-1 outline-offset-4 outline-amber-400/70", hover: "" },
};

export default function BlockFrame({ block, rect, selected, showHandles, interactive, editing, grip = false, autoHeight = false, outline = "solid", onPointerDown, onDoubleClick, children }) {
  const outlineClass = OUTLINES[outline] ?? OUTLINES.solid;
  return (
    <div
      data-block-id={block.id}
      className={`absolute ${interactive ? "" : "pointer-events-none"} ${selected ? outlineClass.selected : interactive ? outlineClass.hover : ""}`}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        ...(autoHeight ? { minHeight: rect.h } : { height: rect.h }),
        zIndex: selected ? 15 : 10,
        touchAction: "none",
        cursor: interactive && !editing ? "move" : undefined,
      }}
      onPointerDown={(event) => {
        if (!interactive || event.button !== 0) return;
        if (editing) return; // text selection inside the editor
        if (event.target.closest("input, textarea, select, [data-no-drag]")) {
          onPointerDown(event, block, { mode: "select" });
          return;
        }
        onPointerDown(event, block, { mode: "move" });
      }}
      onDoubleClick={(event) => onDoubleClick?.(event, block)}
    >
      {children}
      {interactive && grip && (selected || editing) && (
        <button
          type="button"
          data-export-ignore
          aria-label="Drag to move"
          title="Drag to move"
          onPointerDown={(event) => { event.stopPropagation(); onPointerDown(event, block, { mode: "move", fromGrip: true }); }}
          className="absolute -top-7 left-1/2 flex h-6 w-8 -translate-x-1/2 cursor-grab items-center justify-center rounded-md border border-stone-200 bg-white text-stone-500 shadow-sm active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      {interactive && showHandles && HANDLES.map((handle) => (
        <span
          key={handle.id}
          data-export-ignore
          role="presentation"
          className="absolute z-20 h-2.5 w-2.5 rounded-sm border-[1.5px] border-amber-600 bg-white"
          style={{ ...handle.style, cursor: handle.cursor }}
          onPointerDown={(event) => { event.stopPropagation(); onPointerDown(event, block, { mode: "resize", handle: handle.id }); }}
        />
      ))}
    </div>
  );
}
