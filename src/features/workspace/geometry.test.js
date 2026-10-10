import { describe, expect, it } from "vitest";
import { alignBlocks, distributeBlocks, intersects, resizeRect, snapMove, snapTargets, unionBounds } from "./geometry";

const block = (id, x, y, width = 100, height = 50) => ({ id, x, y, width, height });

describe("geometry", () => {
  it("unions and intersects", () => {
    expect(unionBounds([block("a", 10, 10), block("b", 200, 100)])).toEqual({ x: 10, y: 10, w: 290, h: 140 });
    expect(intersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(intersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 0, w: 5, h: 5 })).toBe(false);
  });

  it("snaps edges to page margins and other blocks", () => {
    const targets = snapTargets([block("other", 500, 300)]);
    const box = { x: 43, y: 200, w: 100, h: 50 };
    expect(snapMove(box, 0, 0, targets, 6)).toMatchObject({ dx: -3, dy: 0 });
    const result = snapMove({ x: 0, y: 0, w: 100, h: 50 }, 497, 302, targets, 6);
    expect(result.dx).toBe(500);
    expect(result.dy).toBe(300);
    expect(result.guides).toHaveLength(2);
    expect(snapMove(box, 120, 0, targets, 6).guides).toHaveLength(0);
  });

  it("resizes from any handle with a minimum and optional aspect lock", () => {
    const start = { x: 100, y: 100, w: 200, h: 100 };
    expect(resizeRect(start, "se", 50, 20)).toEqual({ x: 100, y: 100, w: 250, h: 120 });
    expect(resizeRect(start, "nw", 50, 20)).toEqual({ x: 150, y: 120, w: 150, h: 80 });
    expect(resizeRect(start, "w", 500, 0).w).toBe(24);
    expect(resizeRect(start, "se", 100, 0, { keepRatio: true })).toEqual({ x: 100, y: 100, w: 300, h: 150 });
  });

  it("aligns and distributes", () => {
    const blocks = [block("a", 0, 0), block("b", 50, 100, 200), block("c", 400, 40)];
    expect(alignBlocks(blocks, "left")).toEqual({ a: { x: 0 }, b: { x: 0 }, c: { x: 0 } });
    expect(alignBlocks(blocks, "right").b).toEqual({ x: 300 });
    const spread = distributeBlocks(blocks, "x");
    expect(spread).toEqual({ a: { x: 0 }, b: { x: 150 }, c: { x: 400 } });
    expect(distributeBlocks(blocks.slice(0, 2), "x")).toEqual({});
  });
});
