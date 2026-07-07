import { useCallback, useEffect, useRef, useState } from "react";

// ─── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = "taskr_sticker_layout_";
const MIN_WIDTH = 260;
const MIN_HEIGHT = 180;
const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 280;
const GRID_COLS = 3;
const GRID_GAP = 20;
const GRID_PADDING = 10;

// ─── Auto-layout: compute default grid position for a sticker ──────────────────

function computeDefaultPosition(index, canvasWidth) {
  const colWidth = Math.max(DEFAULT_WIDTH, (canvasWidth - GRID_PADDING * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);
  const col = index % GRID_COLS;
  const row = Math.floor(index / GRID_COLS);
  return {
    x: GRID_PADDING + col * (colWidth + GRID_GAP),
    y: GRID_PADDING + row * (DEFAULT_HEIGHT + GRID_GAP),
    w: Math.min(colWidth, DEFAULT_WIDTH),
    h: DEFAULT_HEIGHT,
  };
}

// ─── Persistence ───────────────────────────────────────────────────────────────

function readLayout(userId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLayout(userId, layout) {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(layout));
  } catch {
    // Silently fail if localStorage is full
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useStickerInteractions — manages position, size, z-index for free-form sticker placement.
 *
 * Architecture notes (for future zoom/pan):
 * - All coordinates are in "canvas space" (unscaled pixels)
 * - For zoom: divide pointer deltas by `scale` before applying to positions
 * - For pan: offset pointer positions by canvas `translateX/Y`
 * - For multi-select: extend `selectedId` to `selectedIds: Set<string>`
 */
export default function useStickerInteractions(taskIds, userId, canvasWidth) {
  const [layout, setLayout] = useState(() => readLayout(userId));
  const [selectedId, setSelectedId] = useState(null);
  const [dragState, setDragState] = useState(null); // { taskId, startX, startY, origX, origY }
  const [resizeState, setResizeState] = useState(null); // { taskId, corner, startX, startY, origX, origY, origW, origH }
  const maxZRef = useRef(
    Object.values(layout).reduce((max, item) => Math.max(max, item?.zIndex || 0), 100)
  );
  const layoutRef = useRef(layout);

  // Keep layoutRef in sync
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  // Persist on change (debounced)
  const persistTimer = useRef(null);
  useEffect(() => {
    if (!userId) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      writeLayout(userId, layout);
    }, 500);
    return () => { if (persistTimer.current) clearTimeout(persistTimer.current); };
  }, [layout, userId]);

  // Ensure every task has a layout entry; assign default positions to new tasks
  useEffect(() => {
    if (!taskIds.length) return;
    setLayout((prev) => {
      const next = { ...prev };
      let changed = false;
      const width = canvasWidth || 800;
      // Find existing positioned count to place new ones after
      const existingCount = Object.keys(prev).filter((id) => taskIds.includes(id)).length;
      let newIndex = existingCount;
      for (const id of taskIds) {
        if (!next[id]) {
          const pos = computeDefaultPosition(newIndex, width);
          next[id] = { ...pos, zIndex: ++maxZRef.current };
          changed = true;
          newIndex++;
        }
      }
      // Clean up stale entries for tasks that no longer exist
      for (const id of Object.keys(next)) {
        if (!taskIds.includes(id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [taskIds, canvasWidth]);

  // ─── Bring to front ────────────────────────────────────────────────────────

  const bringToFront = useCallback((taskId) => {
    maxZRef.current += 1;
    setLayout((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], zIndex: maxZRef.current },
    }));
    setSelectedId(taskId);
  }, []);

  // ─── Drag ──────────────────────────────────────────────────────────────────

  const startDrag = useCallback((taskId, e) => {
    // Don't drag if clicking on interactive elements
    const tag = e.target.tagName.toLowerCase();
    if (["input", "textarea", "select", "button", "label", "a"].includes(tag)) return;
    if (e.target.closest("button, input, textarea, select, label, a, .resize-handle")) return;

    e.preventDefault();
    const current = layoutRef.current[taskId];
    if (!current) return;

    bringToFront(taskId);
    setDragState({
      taskId,
      startX: e.clientX,
      startY: e.clientY,
      origX: current.x,
      origY: current.y,
    });
  }, [bringToFront]);

  // ─── Resize ────────────────────────────────────────────────────────────────

  const startResize = useCallback((taskId, corner, e) => {
    e.preventDefault();
    e.stopPropagation();
    const current = layoutRef.current[taskId];
    if (!current) return;

    bringToFront(taskId);
    setResizeState({
      taskId,
      corner,
      startX: e.clientX,
      startY: e.clientY,
      origX: current.x,
      origY: current.y,
      origW: current.w,
      origH: current.h,
    });
  }, [bringToFront]);

  // ─── Global pointer handlers ───────────────────────────────────────────────

  useEffect(() => {
    if (!dragState && !resizeState) return;

    const onPointerMove = (e) => {
      if (dragState) {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        const currentW = layoutRef.current[dragState.taskId]?.w || DEFAULT_WIDTH;
        setLayout((prev) => ({
          ...prev,
          [dragState.taskId]: {
            ...prev[dragState.taskId],
            x: Math.max(0, Math.min((canvasWidth || 800) - currentW, dragState.origX + dx)),
            y: Math.max(0, dragState.origY + dy),
          },
        }));
      }

      if (resizeState) {
        const dx = e.clientX - resizeState.startX;
        const dy = e.clientY - resizeState.startY;
        const { corner, origX, origY, origW, origH, taskId } = resizeState;

        let newX = origX, newY = origY, newW = origW, newH = origH;

        if (corner === "se") {
          newW = Math.max(MIN_WIDTH, Math.min((canvasWidth || 800) - origX, origW + dx));
          newH = Math.max(MIN_HEIGHT, origH + dy);
        } else if (corner === "sw") {
          const candidateX = Math.max(0, origX + dx);
          const actualDx = candidateX - origX;
          const candidateW = origW - actualDx;
          if (candidateW >= MIN_WIDTH) {
            newX = candidateX;
            newW = candidateW;
          }
          newH = Math.max(MIN_HEIGHT, origH + dy);
        } else if (corner === "ne") {
          newW = Math.max(MIN_WIDTH, Math.min((canvasWidth || 800) - origX, origW + dx));
          const candidateH = Math.max(MIN_HEIGHT, origH - dy);
          if (candidateH >= MIN_HEIGHT) {
            newY = origY + dy;
            newH = candidateH;
          }
        } else if (corner === "nw") {
          const candidateX = Math.max(0, origX + dx);
          const actualDx = candidateX - origX;
          const candidateW = origW - actualDx;
          if (candidateW >= MIN_WIDTH) {
            newX = candidateX;
            newW = candidateW;
          }
          const candidateH = Math.max(MIN_HEIGHT, origH - dy);
          if (candidateH >= MIN_HEIGHT) {
            newY = origY + dy;
            newH = candidateH;
          }
        }

        setLayout((prev) => ({
          ...prev,
          [taskId]: {
            ...prev[taskId],
            x: newX,
            y: Math.max(0, newY),
            w: newW,
            h: newH,
          },
        }));
      }
    };

    const onPointerUp = () => {
      setDragState(null);
      setResizeState(null);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragState, resizeState]);

  // ─── Deselect on canvas click ──────────────────────────────────────────────

  const deselectAll = useCallback(() => {
    setSelectedId(null);
  }, []);

  // ─── Computed canvas height ────────────────────────────────────────────────

  const maxBottom = Object.values(layout).reduce((max, item) => {
    if (!item) return max;
    return Math.max(max, (item.y || 0) + (item.h || DEFAULT_HEIGHT));
  }, 0);

  return {
    layout,
    selectedId,
    isDragging: !!dragState,
    isResizing: !!resizeState,
    activeId: dragState?.taskId || resizeState?.taskId || null,
    maxBottom,
    startDrag,
    startResize,
    bringToFront,
    deselectAll,
  };
}
