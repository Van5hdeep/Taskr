import { useCallback, useEffect, useRef, useState } from "react";

const MIN_W = 220;
const MIN_H = 150;
const DEFAULT_W = 260;
const DEFAULT_H = 210;
const GAP = 20;
const PAD = 12;

/**
 * Free-board geometry. Positions live on each task row (pos_x/pos_y/width/height);
 * this hook keeps a local copy for smooth dragging and commits once per gesture.
 * Entries are never dropped for tasks that are merely filtered out.
 */
export function useFreeLayout(tasks, canvasWidth, onCommit) {
  const [layout, setLayout] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [gesture, setGesture] = useState(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  // Seed entries for tasks we haven't seen: saved position, else the next grid slot.
  useEffect(() => {
    setLayout((previous) => {
      const missing = tasks.filter((task) => !previous[task.id]);
      if (!missing.length) return previous;
      const next = { ...previous };
      const width = Math.max(canvasWidth || 900, DEFAULT_W + PAD * 2);
      const cols = Math.max(1, Math.floor((width - PAD * 2 + GAP) / (DEFAULT_W + GAP)));
      const occupiedBottom = Object.values(previous).reduce((max, item) => Math.max(max, item.y + item.h), 0);
      const positionedBottom = tasks.reduce((max, task) => (task.pos ? Math.max(max, task.pos.y + task.pos.h) : max), occupiedBottom);
      let slot = 0;
      for (const task of missing) {
        if (task.pos) {
          next[task.id] = { ...task.pos, z: task.zIndex || 1 };
        } else {
          const col = slot % cols;
          const row = Math.floor(slot / cols);
          next[task.id] = {
            x: PAD + col * (DEFAULT_W + GAP),
            y: (positionedBottom ? positionedBottom + GAP : PAD) + row * (DEFAULT_H + GAP),
            w: DEFAULT_W,
            h: DEFAULT_H,
            z: task.zIndex || 1,
          };
          slot += 1;
        }
      }
      return next;
    });
  }, [tasks, canvasWidth]);

  const maxZ = () => Object.values(layoutRef.current).reduce((max, item) => Math.max(max, item.z || 0), 0);

  const bringToFront = useCallback((id) => {
    setSelectedId(id);
    setLayout((previous) => (previous[id] ? { ...previous, [id]: { ...previous[id], z: maxZ() + 1 } } : previous));
  }, []);

  const begin = useCallback((mode, id, event, corner = null) => {
    if (mode === "drag" && event.target.closest("button, input, textarea, select, label, a, [data-no-drag]")) return;
    const current = layoutRef.current[id];
    if (!current) return;
    event.preventDefault();
    event.stopPropagation();
    bringToFront(id);
    setGesture({ mode, id, corner, startX: event.clientX, startY: event.clientY, origin: { ...current } });
  }, [bringToFront]);

  useEffect(() => {
    if (!gesture) return undefined;
    const width = canvasWidth || 900;

    const onMove = (event) => {
      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;
      const o = gesture.origin;
      let next;
      if (gesture.mode === "drag") {
        next = { ...o, x: Math.max(0, Math.min(width - o.w, o.x + dx)), y: Math.max(0, o.y + dy) };
      } else {
        const c = gesture.corner;
        let { x, y, w, h } = o;
        if (c.includes("e")) w = Math.max(MIN_W, Math.min(width - o.x, o.w + dx));
        if (c.includes("s")) h = Math.max(MIN_H, o.h + dy);
        if (c.includes("w")) { const nx = Math.min(o.x + o.w - MIN_W, Math.max(0, o.x + dx)); w = o.w + (o.x - nx); x = nx; }
        if (c.includes("n")) { const ny = Math.min(o.y + o.h - MIN_H, Math.max(0, o.y + dy)); h = o.h + (o.y - ny); y = ny; }
        next = { ...o, x, y, w, h };
      }
      setLayout((previous) => ({ ...previous, [gesture.id]: { ...next, z: previous[gesture.id]?.z ?? o.z } }));
    };

    const onUp = () => {
      const item = layoutRef.current[gesture.id];
      setGesture(null);
      if (!item) return;
      const o = gesture.origin;
      const moved = item.x !== o.x || item.y !== o.y || item.w !== o.w || item.h !== o.h || item.z !== o.z;
      if (moved) commitRef.current(gesture.id, { pos: { x: Math.round(item.x), y: Math.round(item.y), w: Math.round(item.w), h: Math.round(item.h) }, zIndex: item.z });
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
  }, [gesture, canvasWidth]);

  const visibleIds = new Set(tasks.map((task) => task.id));
  const maxBottom = Object.entries(layout).reduce((max, [id, item]) => (visibleIds.has(id) ? Math.max(max, item.y + item.h) : max), 0);

  return {
    layout,
    selectedId,
    activeId: gesture?.id ?? null,
    isDragging: gesture?.mode === "drag",
    maxBottom,
    startDrag: (id, event) => begin("drag", id, event),
    startResize: (id, corner, event) => begin("resize", id, event, corner),
    bringToFront,
    deselect: () => setSelectedId(null),
  };
}
