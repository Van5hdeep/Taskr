import { useCallback, useRef, useState, useMemo } from "react";

// ─── Constants ─────────────────────────────────────────────────────────────────

/** Distance from bottom edge that triggers canvas expansion */
const EXPANSION_TRIGGER_PX = 80;

/** How much the canvas grows each expansion step */
const EXPANSION_STEP_PX = 200;

/** Absolute minimum canvas height */
const CANVAS_MIN_HEIGHT_PX = 680;

/** Padding below the lowest sticker so there's always scroll room */
const CANVAS_CONTENT_PADDING_PX = 80;

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyStateIllustration({ dark }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 select-none pointer-events-none">
      <div className="animate-float mb-6">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="10" y="10" width="52" height="52" rx="8" fill={dark ? "rgba(37, 99, 235, 0.15)" : "rgba(37, 99, 235, 0.08)"} stroke={dark ? "rgba(96, 165, 250, 0.4)" : "rgba(37, 99, 235, 0.25)"} strokeWidth="2" />
          <path d="M46 10 L62 10 L62 26 Q54 26 46 18 Q46 14 46 10Z" fill={dark ? "rgba(37, 99, 235, 0.25)" : "rgba(37, 99, 235, 0.12)"} stroke={dark ? "rgba(96, 165, 250, 0.4)" : "rgba(37, 99, 235, 0.25)"} strokeWidth="2" strokeLinejoin="round" />
          <line x1="20" y1="28" x2="42" y2="28" stroke={dark ? "rgba(148, 163, 184, 0.3)" : "rgba(0, 0, 0, 0.1)"} strokeWidth="2" strokeLinecap="round" />
          <line x1="20" y1="36" x2="38" y2="36" stroke={dark ? "rgba(148, 163, 184, 0.25)" : "rgba(0, 0, 0, 0.07)"} strokeWidth="2" strokeLinecap="round" />
          <line x1="20" y1="44" x2="34" y2="44" stroke={dark ? "rgba(148, 163, 184, 0.2)" : "rgba(0, 0, 0, 0.05)"} strokeWidth="2" strokeLinecap="round" />
          <circle cx="58" cy="58" r="14" fill={dark ? "#2563eb" : "#3b82f6"} opacity={dark ? "0.25" : "0.15"} />
          <line x1="58" y1="52" x2="58" y2="64" stroke={dark ? "#60a5fa" : "#2563eb"} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
          <line x1="52" y1="58" x2="64" y2="58" stroke={dark ? "#60a5fa" : "#2563eb"} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
        </svg>
      </div>
      <h3 className={`text-lg font-bold mb-2 ${dark ? "text-slate-200" : "text-zinc-800"}`}>
        No stickers yet
      </h3>
      <p className={`text-sm text-center max-w-xs leading-relaxed ${dark ? "text-slate-400" : "text-zinc-500"}`}>
        Use the Task Dump to create your first task.
      </p>
    </div>
  );
}

function FilterEmptyState({ dark }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 select-none pointer-events-none">
      <div className={`mb-4 rounded-full p-4 ${dark ? "bg-blue-500/10" : "bg-blue-50"}`}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={dark ? "#60a5fa" : "#3b82f6"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <h3 className={`text-sm font-bold mb-1 ${dark ? "text-slate-200" : "text-zinc-800"}`}>
        No tasks match your filters
      </h3>
      <p className={`text-xs ${dark ? "text-slate-400" : "text-zinc-500"}`}>
        Try adjusting the priority or date filters above
      </p>
    </div>
  );
}

// ─── StickerWorkspace ────────────────────────────────────────────────────────

/**
 * StickerWorkspace — purely the scrollable canvas area.
 * Contains a clean, white sticker wall and its stickers.
 * Rejects filterBar and calendar props to enforce separation.
 */
export default function StickerWorkspace({
  taskCount,
  hasActiveFilters,
  maxBottom,
  onCanvasClick,
  canvasRef: externalCanvasRef,
  children,
  height,
  onHeightChange,
}) {
  const viewportRef = useRef(null);
  const [extraHeight, setExtraHeight] = useState(0);

  const [isResizing, setIsResizing] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handlePointerDown = (e) => {
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    e.target.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e) => {
    if (!isResizing) return;
    const dy = e.clientY - startYRef.current;
    onHeightChange(Math.max(300, startHeightRef.current + dy));
  };
  const handlePointerUp = (e) => {
    setIsResizing(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  // Compute canvas height from sticker content + manual expansions
  const canvasHeight = useMemo(() => {
    const contentHeight = maxBottom + CANVAS_CONTENT_PADDING_PX;
    return Math.max(CANVAS_MIN_HEIGHT_PX, contentHeight) + extraHeight;
  }, [maxBottom, extraHeight]);

  // Dynamic expansion: when cursor nears the bottom edge, grow the canvas
  const handleCanvasMouseMove = useCallback((e) => {
    const canvas = e.currentTarget;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cursorYInCanvas = e.clientY - rect.top + (viewportRef.current?.scrollTop || 0);
    const distanceFromBottom = canvasHeight - cursorYInCanvas;

    if (distanceFromBottom < EXPANSION_TRIGGER_PX && distanceFromBottom > 0) {
      setExtraHeight((prev) => prev + EXPANSION_STEP_PX);
    }
  }, [canvasHeight]);

  const isEmpty = taskCount === 0;
  const showEmptyState = isEmpty && !hasActiveFilters;
  const showFilterEmpty = isEmpty && hasActiveFilters;

  const containerBorder = "border-slate-200";
  const canvasBg = "bg-white";

  return (
    <div className="relative z-10 isolate w-full transition-[height] duration-75 ease-linear" style={{ height: `${height}px` }}>
      <div
        ref={viewportRef}
        data-sticker-workspace-viewport
        className={`absolute inset-0 overflow-y-auto overflow-x-hidden rounded-2xl border scrollbar-thin ${containerBorder} ${canvasBg}`}
      >
        <div
          ref={externalCanvasRef}
          data-canvas-layer
          className="relative w-full"
          style={{ minHeight: `${canvasHeight}px`, transition: "min-height 0.3s ease-out" }}
          onMouseMove={handleCanvasMouseMove}
          onClick={(e) => {
            // Deselect stickers when clicking empty canvas
            if (e.target === e.currentTarget || e.target.getAttribute("data-canvas-layer") != null) {
              onCanvasClick?.();
            }
          }}
        >
          {showEmptyState && <EmptyStateIllustration dark={false} />}
          {showFilterEmpty && <FilterEmptyState dark={false} />}
          {children}
        </div>
      </div>
      
      {/* Resizer Handle */}
      <div
        className="absolute bottom-0 left-0 right-0 h-5 cursor-ns-resize z-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-t from-blue-500/20 to-transparent rounded-b-2xl"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
         <div className="w-16 h-1 rounded-full bg-blue-500/60" />
      </div>
    </div>
  );
}
