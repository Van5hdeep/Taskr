import { A4_HEIGHT, A4_WIDTH, PAGE_MARGIN } from "./model";

export const bounds = (block) => ({ x: block.x, y: block.y, w: block.width, h: block.height });

export function unionBounds(blocks) {
  if (!blocks.length) return null;
  const x = Math.min(...blocks.map((b) => b.x));
  const y = Math.min(...blocks.map((b) => b.y));
  const right = Math.max(...blocks.map((b) => b.x + b.width));
  const bottom = Math.max(...blocks.map((b) => b.y + b.height));
  return { x, y, w: right - x, h: bottom - y };
}

export function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function normalizeRect(x1, y1, x2, y2) {
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
}

/** Snap lines for a page: margins, centre, and the edges/centres of other blocks. */
export function snapTargets(blocks) {
  const xs = [PAGE_MARGIN, A4_WIDTH / 2, A4_WIDTH - PAGE_MARGIN];
  const ys = [PAGE_MARGIN, A4_HEIGHT / 2, A4_HEIGHT - PAGE_MARGIN];
  for (const block of blocks) {
    xs.push(block.x, block.x + block.width / 2, block.x + block.width);
    ys.push(block.y, block.y + block.height / 2, block.y + block.height);
  }
  return { xs, ys };
}

function nearest(values, targets, threshold) {
  let best = null;
  for (const value of values) {
    for (const target of targets) {
      const delta = target - value;
      if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) best = { delta, line: target };
    }
  }
  return best;
}

/**
 * Adjusts a move (dx, dy) of `box` so its left/centre/right and
 * top/middle/bottom land on nearby targets. Returns the snapped delta and the
 * guide lines to draw.
 */
export function snapMove(box, dx, dy, targets, threshold) {
  const moved = { x: box.x + dx, y: box.y + dy };
  const sx = nearest([moved.x, moved.x + box.w / 2, moved.x + box.w], targets.xs, threshold);
  const sy = nearest([moved.y, moved.y + box.h / 2, moved.y + box.h], targets.ys, threshold);
  return {
    dx: dx + (sx?.delta ?? 0),
    dy: dy + (sy?.delta ?? 0),
    guides: [...(sx ? [{ axis: "x", at: sx.line }] : []), ...(sy ? [{ axis: "y", at: sy.line }] : [])],
  };
}

/** Resize from a handle ("n", "se", …). Keeps a minimum size; `keepRatio` locks aspect. */
export function resizeRect(start, handle, dx, dy, { min = 24, keepRatio = false } = {}) {
  let { x, y, w, h } = start;
  if (handle.includes("e")) w = start.w + dx;
  if (handle.includes("s")) h = start.h + dy;
  if (handle.includes("w")) { w = start.w - dx; x = start.x + dx; }
  if (handle.includes("n")) { h = start.h - dy; y = start.y + dy; }
  if (keepRatio && start.w && start.h) {
    const ratio = start.w / start.h;
    if (handle.length === 2 || handle === "e" || handle === "w") h = w / ratio;
    else w = h * ratio;
    if (handle.includes("n")) y = start.y + start.h - h;
    if (handle.includes("w")) x = start.x + start.w - w;
  }
  if (w < min) { if (handle.includes("w")) x -= min - w; w = min; }
  if (h < min) { if (handle.includes("n")) y -= min - h; h = min; }
  return { x, y, w, h };
}

/** Align the given blocks; returns id → { x?, y? } patches. */
export function alignBlocks(blocks, mode) {
  const box = unionBounds(blocks);
  const patches = {};
  for (const block of blocks) {
    if (mode === "left") patches[block.id] = { x: box.x };
    if (mode === "center") patches[block.id] = { x: box.x + box.w / 2 - block.width / 2 };
    if (mode === "right") patches[block.id] = { x: box.x + box.w - block.width };
    if (mode === "top") patches[block.id] = { y: box.y };
    if (mode === "middle") patches[block.id] = { y: box.y + box.h / 2 - block.height / 2 };
    if (mode === "bottom") patches[block.id] = { y: box.y + box.h - block.height };
  }
  return patches;
}

/** Even gaps between 3+ blocks along an axis. */
export function distributeBlocks(blocks, axis) {
  if (blocks.length < 3) return {};
  const pos = axis === "x" ? "x" : "y";
  const size = axis === "x" ? "width" : "height";
  const sorted = [...blocks].sort((a, b) => a[pos] - b[pos]);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = last[pos] + last[size] - first[pos];
  const occupied = sorted.reduce((total, block) => total + block[size], 0);
  const gap = (span - occupied) / (sorted.length - 1);
  const patches = {};
  let cursor = first[pos];
  for (const block of sorted) {
    patches[block.id] = { [pos]: cursor };
    cursor += block[size] + gap;
  }
  return patches;
}
