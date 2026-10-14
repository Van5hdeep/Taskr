import { getStroke } from "perfect-freehand";
import { A4_HEIGHT, A4_WIDTH, PAGE_STEP, uid } from "../../model";

// Ink strokes keep the freedraw element shape saved documents already use:
// { x, y, points: [[dx, dy]], pressures, strokeColor, strokeWidth, opacity }.
// Thickness: strokeWidth × 4.25 document px (the same scale the pen sizes use).
const SIZE_FACTOR = 4.25;
const outlineCache = new WeakMap();
const boundsCache = new WeakMap();

export const isHighlighter = (element) => (element.opacity ?? 100) < 100;

export function strokeInput(element) {
  const simulate = element.simulatePressure ?? !(element.pressures?.length);
  return element.points.map((point, i) => [element.x + point[0], element.y + point[1], simulate ? 0.5 : element.pressures?.[i] ?? 0.5]);
}

export function outlineOptions(element, complete = true) {
  const highlighter = isHighlighter(element);
  const simulate = element.simulatePressure ?? !(element.pressures?.length);
  return {
    size: Math.max(0.6, element.strokeWidth * SIZE_FACTOR),
    thinning: highlighter ? 0 : simulate ? 0.45 : 0.6,
    smoothing: 0.55,
    streamline: 0.25,
    easing: (t) => Math.sin((t * Math.PI) / 2),
    simulatePressure: simulate,
    last: complete,
    start: { cap: true, taper: 0 },
    end: { cap: true, taper: 0 },
  };
}

/** Smooth closed path through the outline polygon (quadratic through midpoints). */
export function pathFromOutline(outline) {
  const path = new Path2D();
  const n = outline.length;
  if (n === 0) return path;
  if (n < 3) {
    path.arc(outline[0][0], outline[0][1], 1, 0, Math.PI * 2);
    return path;
  }
  path.moveTo((outline[0][0] + outline[1][0]) / 2, (outline[0][1] + outline[1][1]) / 2);
  for (let i = 1; i <= n; i += 1) {
    const a = outline[i % n];
    const b = outline[(i + 1) % n];
    path.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  path.closePath();
  return path;
}

export const isBox = (element) => element.shape === "box";

export function elementPath(element, complete = true) {
  if (complete && outlineCache.has(element)) return outlineCache.get(element);
  if (isBox(element)) {
    const box = new Path2D();
    box.roundRect(element.x, element.y, element.width, element.height, Math.min(12, element.height / 2, element.width / 2));
    outlineCache.set(element, box);
    return box;
  }
  const path = pathFromOutline(getStroke(strokeInput(element), outlineOptions(element, complete)));
  if (complete) outlineCache.set(element, path);
  return path;
}

export function drawElement(ctx, element, { ghost = false, complete = true } = {}) {
  ctx.save();
  ctx.globalAlpha = ((element.opacity ?? 100) / 100) * (ghost ? 0.25 : 1);
  if (isHighlighter(element)) ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = element.strokeColor;
  ctx.fill(elementPath(element, complete));
  ctx.restore();
}

let scratch = null;
function scratchFor(canvas) {
  scratch ??= document.createElement("canvas");
  if (scratch.width !== canvas.width || scratch.height !== canvas.height) { scratch.width = canvas.width; scratch.height = canvas.height; }
  return scratch;
}

/**
 * Paints one highlight colour as a single flat layer: marks of that colour are
 * unioned opaque on a scratch canvas, then composited once. Overlapping marks
 * therefore never darken the shade. `extra` are already-built paths (live stroke).
 */
function paintHighlightGroup(ctx, color, opacity, paths) {
  const layer = scratchFor(ctx.canvas);
  const lctx = layer.getContext("2d");
  const transform = ctx.getTransform();
  lctx.setTransform(1, 0, 0, 1, 0, 0);
  lctx.clearRect(0, 0, layer.width, layer.height);
  lctx.setTransform(transform);
  lctx.fillStyle = color;
  for (const path of paths) lctx.fill(path);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = opacity / 100;
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

/** Highlights first (flat per colour), then pen strokes on top. */
export function paintInk(ctx, elements, { ghost = new Set(), skipHighlightColor = null } = {}) {
  const groups = new Map();
  const pens = [];
  for (const element of elements) {
    if (element.isDeleted) continue;
    if (!isHighlighter(element)) { pens.push(element); continue; }
    if (ghost.has(element.id)) { drawElement(ctx, element, { ghost: true }); continue; }
    if (element.strokeColor === skipHighlightColor) continue;
    const group = groups.get(element.strokeColor) ?? { opacity: element.opacity, paths: [] };
    group.paths.push(elementPath(element));
    groups.set(element.strokeColor, group);
  }
  for (const [color, group] of groups) paintHighlightGroup(ctx, color, group.opacity, group.paths);
  for (const element of pens) drawElement(ctx, element, { ghost: ghost.has(element.id) });
}

/** Live highlighter: the colour's existing marks plus the stroke being drawn, flat. */
export function paintLiveHighlight(ctx, elements, color, liveElement, ghost) {
  const paths = elements.filter((element) => !element.isDeleted && isHighlighter(element) && element.strokeColor === color && !ghost.has(element.id)).map((element) => elementPath(element));
  paths.push(elementPath(liveElement, false));
  const lctx = ctx;
  lctx.fillStyle = color;
  for (const path of paths) lctx.fill(path);
}

/** Closed loop drawn with the highlighter → the rounded box it encloses, or null. */
export function loopToBox(points) {
  if (points.length < 8) return null;
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity; let length = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x, y] = points[i];
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    if (i) length += Math.hypot(x - points[i - 1][0], y - points[i - 1][1]);
  }
  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 14 || h < 8) return null;
  const gap = Math.hypot(points[0][0] - points[points.length - 1][0], points[0][1] - points[points.length - 1][1]);
  if (gap > 0.35 * Math.max(w, h)) return null; // not closed
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  if (Math.abs(area) / 2 < 0.4 * w * h) return null; // a scribble, not a loop around something
  if (length < 1.3 * (w + h)) return null;
  const pad = 2;
  return { x: minX - pad, y: minY - pad, width: w + pad * 2, height: h + pad * 2 };
}

/** Brush a stroke would draw: in progress, so never cached. */
export function drawPoints(ctx, element) {
  drawElement(ctx, element, { complete: false });
}

function boundsOf(element) {
  let cached = boundsCache.get(element);
  if (!cached) {
    const pad = element.strokeWidth * SIZE_FACTOR;
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
    for (const [px, py] of element.points) {
      minX = Math.min(minX, element.x + px); maxX = Math.max(maxX, element.x + px);
      minY = Math.min(minY, element.y + py); maxY = Math.max(maxY, element.y + py);
    }
    cached = { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
    boundsCache.set(element, cached);
  }
  return cached;
}

const segmentDistance = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax; const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

/** Does a circle of `radius` at (x, y) touch the stroke? */
export function strokeHit(element, x, y, radius) {
  const b = boundsOf(element);
  if (x < b.minX - radius || x > b.maxX + radius || y < b.minY - radius || y > b.maxY + radius) return false;
  if (isBox(element)) return x >= element.x - radius && x <= element.x + element.width + radius && y >= element.y - radius && y <= element.y + element.height + radius;
  const reach = radius + (element.strokeWidth * SIZE_FACTOR) / 2;
  const { points } = element;
  if (points.length === 1) return Math.hypot(x - element.x - points[0][0], y - element.y - points[0][1]) <= reach;
  for (let i = 1; i < points.length; i += 1) {
    if (segmentDistance(x, y, element.x + points[i - 1][0], element.y + points[i - 1][1], element.x + points[i][0], element.y + points[i][1]) <= reach) return true;
  }
  return false;
}

export function createStroke({ points, pressures, simulatePressure, color, width, highlighter }) {
  const x = points[0][0];
  const y = points[0][1];
  const rel = points.map((p) => [p[0] - x, p[1] - y]);
  const xs = rel.map((p) => p[0]); const ys = rel.map((p) => p[1]);
  return {
    id: uid(), type: "freedraw", x, y,
    width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys),
    angle: 0, strokeColor: color, backgroundColor: "transparent", fillStyle: "solid",
    strokeWidth: width, strokeStyle: "solid", roughness: 0, opacity: highlighter ? 35 : 100,
    points: rel, pressures, simulatePressure,
    seed: Math.floor(Math.random() * 2 ** 31), version: 1, versionNonce: Math.floor(Math.random() * 2 ** 31),
    isDeleted: false, groupIds: [], frameId: null, roundness: null, boundElements: null,
    updated: Date.now(), link: null, locked: false,
  };
}

/** One page's handwriting as a transparent canvas (for PDF / PNG / print). */
export function renderInkPage(ink, pageIndex, pageCount, scale) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(A4_WIDTH * scale);
  canvas.height = Math.round(A4_HEIGHT * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.translate(0, -pageIndex * PAGE_STEP);
  paintInk(ctx, ink.filter((element) => Math.min(pageCount - 1, Math.max(0, Math.floor((element.y ?? 0) / PAGE_STEP))) === pageIndex));
  return canvas;
}
