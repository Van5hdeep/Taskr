import { useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { A4_WIDTH } from "../model";
import { createStroke, drawElement, drawPoints, strokeHit } from "./ink/render";
import { touchMayDraw } from "./ink/input";

const MAX_SIDE = 16000;
const MAX_AREA = 16_000_000; // iPad Safari refuses canvases above ~16.7M px (it draws nothing)
const ERASER_RADIUS = 9; // document px

/**
 * Handwriting canvas: our own pointer pipeline (coalesced samples, adaptive
 * smoothing, predicted ink), perfect-freehand outlines, stroke-level eraser.
 * Committed strokes live on a base canvas; the stroke being written is
 * redrawn each frame on a second canvas so ink stays close to the nib.
 */
export default function InkCanvas({ ref, elements, onCommit, tool, color, width, zoom, documentHeight, locked }) {
  const wrapRef = useRef(null);
  const baseRef = useRef(null);
  const liveRef = useRef(null);
  const live = useRef(null); // the gesture in progress
  const erased = useRef(new Set());
  const frame = useRef(0);
  const scaleRef = useRef(1);
  const props = useRef({});
  props.current = { elements, onCommit, tool, color, width, locked, documentHeight };

  const active = !locked && ["pen", "highlighter", "eraser"].includes(tool);

  const redrawBase = () => {
    const canvas = baseRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const s = scaleRef.current;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    for (const element of props.current.elements) if (!element.isDeleted) drawElement(ctx, element, { ghost: erased.current.has(element.id) });
  };

  // Backing store follows zoom (crisp ink when zoomed in), capped for huge documents.
  useLayoutEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    const wanted = Math.max(1, dpr * zoom);
    const scale = Math.min(wanted, MAX_SIDE / documentHeight, Math.sqrt(MAX_AREA / (A4_WIDTH * documentHeight)));
    scaleRef.current = scale;
    for (const canvas of [baseRef.current, liveRef.current]) {
      canvas.width = Math.round(A4_WIDTH * scale);
      canvas.height = Math.round(documentHeight * scale);
    }
    redrawBase();
  }, [zoom, documentHeight]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => { erased.current = new Set(); redrawBase(); }, [elements]); // eslint-disable-line react-hooks/exhaustive-deps

  const toDoc = (clientX, clientY) => {
    const box = baseRef.current.getBoundingClientRect();
    return [((clientX - box.left) / box.width) * A4_WIDTH, ((clientY - box.top) / box.height) * props.current.documentHeight];
  };

  const clearLive = () => {
    const canvas = liveRef.current;
    canvas?.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  };

  const paintLive = () => {
    frame.current = 0;
    const g = live.current;
    if (!g || g.kind !== "draw") return;
    const canvas = liveRef.current;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const s = scaleRef.current;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    // Real samples plus the browser's predicted next positions (display only).
    const last = g.pressures[g.pressures.length - 1];
    const points = [...g.points, ...g.predicted];
    const pressures = [...g.pressures, ...g.predicted.map(() => last)];
    drawPoints(ctx, { x: 0, y: 0, points, pressures, simulatePressure: g.simulate, strokeColor: g.color, strokeWidth: g.width, opacity: g.highlighter ? 35 : 100 });
  };
  const schedule = () => { if (!frame.current) frame.current = requestAnimationFrame(paintLive); };

  const addSample = (g, x, y, pressure) => {
    const last = g.points[g.points.length - 1];
    const distance = Math.hypot(x - last[0], y - last[1]);
    g.raw = [x, y, pressure];
    if (distance < 0.35) return;
    // Slow, small movement is hand tremor / sensor noise → smooth it; fast movement passes through.
    const alpha = g.pen ? 0.85 : Math.min(1, Math.max(0.4, distance / (distance + 4)));
    g.points.push([last[0] + (x - last[0]) * alpha, last[1] + (y - last[1]) * alpha]);
    g.pressures.push(pressure);
  };

  const eraseAt = (g, x, y) => {
    let changed = false;
    const from = g.lastErase ?? [x, y];
    const steps = Math.max(1, Math.ceil(Math.hypot(x - from[0], y - from[1]) / (ERASER_RADIUS / 2)));
    for (let i = 1; i <= steps; i += 1) {
      const px = from[0] + ((x - from[0]) * i) / steps;
      const py = from[1] + ((y - from[1]) * i) / steps;
      for (const element of props.current.elements) {
        if (element.isDeleted || erased.current.has(element.id)) continue;
        if (strokeHit(element, px, py, ERASER_RADIUS)) { erased.current.add(element.id); changed = true; }
      }
    }
    g.lastErase = [x, y];
    if (changed) redrawBase();
  };

  const finish = (commit) => {
    const g = live.current;
    if (!g) return;
    live.current = null;
    window.removeEventListener("pointermove", g.onMove);
    window.removeEventListener("pointerup", g.onUp);
    window.removeEventListener("pointercancel", g.onCancel);
    window.removeEventListener("pointerdown", g.onOtherDown, true);
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    clearLive();
    if (!commit) {
      if (g.kind === "erase" && erased.current.size) { erased.current = new Set(); redrawBase(); }
      return;
    }
    const { elements: current, onCommit } = props.current;
    if (g.kind === "erase") {
      if (erased.current.size) onCommit(current.filter((element) => !erased.current.has(element.id)));
      return;
    }
    // End exactly where the pen lifted.
    if (g.raw) { g.points.push([g.raw[0], g.raw[1]]); g.pressures.push(g.raw[2]); }
    if (g.points.length === 1) { g.points.push([...g.points[0]]); g.pressures.push(g.pressures[0]); }
    onCommit([...current, createStroke({ points: g.points, pressures: g.pressures, simulatePressure: g.simulate, color: g.color, width: g.width, highlighter: g.highlighter })]);
  };

  /** Start writing/erasing from a pointer-down (or a pointer that is already down). */
  const begin = (event) => {
    const { tool: currentTool, color: currentColor, width: currentWidth, locked: isLocked } = props.current;
    if (isLocked || live.current) return false;
    if (event.pointerType === "touch" && !touchMayDraw(event)) return false;
    const pen = event.pointerType === "pen";
    const [x, y] = toDoc(event.clientX, event.clientY);
    const pressure = pen ? event.pressure || 0.5 : 0.5;
    const g = {
      // The stylus's eraser end (button 5 / buttons&32) erases whatever tool is active.
      kind: currentTool === "eraser" || event.button === 5 || (event.buttons & 32) ? "erase" : "draw",
      pointerId: event.pointerId, pen, simulate: !pen, touch: event.pointerType === "touch",
      highlighter: currentTool === "highlighter", color: currentColor, width: currentWidth,
      points: [[x, y]], pressures: [pressure], predicted: [], raw: null,
    };
    g.onMove = (move) => {
      if (move.pointerId !== g.pointerId) return;
      const samples = move.getCoalescedEvents?.() ?? [];
      for (const sample of samples.length ? samples : [move]) {
        const [sx, sy] = toDoc(sample.clientX, sample.clientY);
        if (g.kind === "erase") eraseAt(g, sx, sy);
        else addSample(g, sx, sy, pen ? sample.pressure || pressure : 0.5);
      }
      if (g.kind === "draw") {
        g.predicted = (move.getPredictedEvents?.() ?? []).slice(0, 3).map((p) => toDoc(p.clientX, p.clientY));
        schedule();
      }
    };
    g.onUp = (up) => { if (up.pointerId === g.pointerId) { g.onMove(up); finish(true); } };
    g.onCancel = (cancel) => { if (cancel.pointerId === g.pointerId) finish(false); };
    // A second finger means pinch/pan, not writing.
    g.onOtherDown = (down) => { if (g.touch && down.pointerType === "touch" && down.pointerId !== g.pointerId) finish(false); };
    live.current = g;
    window.addEventListener("pointermove", g.onMove);
    window.addEventListener("pointerup", g.onUp);
    window.addEventListener("pointercancel", g.onCancel);
    window.addEventListener("pointerdown", g.onOtherDown, true);
    if (g.kind === "erase") eraseAt(g, x, y);
    else schedule();
    return true;
  };

  useImperativeHandle(ref, () => ({ begin, cancel: () => finish(false), isDrawing: () => Boolean(live.current) }));

  // Active tool: the canvas takes the pointer directly.
  useEffect(() => {
    const element = wrapRef.current;
    if (!element || !active) return undefined;
    const onDown = (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (begin(event)) { event.inkClaimed = true; event.preventDefault(); }
    };
    element.addEventListener("pointerdown", onDown);
    return () => element.removeEventListener("pointerdown", onDown);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { finish(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (import.meta.env.DEV) window.__taskrInk = { elements: () => props.current.elements, begin };
  });

  return (
    <div
      ref={wrapRef}
      className="taskr-ink absolute left-0 top-0 z-[25]"
      data-export-ignore
      data-ink-tool={tool}
      aria-label="Handwriting layer"
      style={{ pointerEvents: active ? "auto" : "none", touchAction: "none", width: A4_WIDTH, height: documentHeight }}
    >
      <canvas ref={baseRef} className="absolute left-0 top-0" style={{ width: A4_WIDTH, height: documentHeight }} />
      <canvas ref={liveRef} className="pointer-events-none absolute left-0 top-0" style={{ width: A4_WIDTH, height: documentHeight }} />
    </div>
  );
}
