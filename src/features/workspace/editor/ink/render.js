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

export function elementPath(element, complete = true) {
  if (complete && outlineCache.has(element)) return outlineCache.get(element);
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
  for (const element of ink) {
    if (element.isDeleted) continue;
    const index = Math.min(pageCount - 1, Math.max(0, Math.floor((element.y ?? 0) / PAGE_STEP)));
    if (index === pageIndex) drawElement(ctx, element);
  }
  return canvas;
}
