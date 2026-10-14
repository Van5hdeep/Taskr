import { describe, expect, it } from "vitest";
import { deletePage, docToText, migrateDocument, movePage, PAGE_STEP, TEMPLATES, textToDoc } from "./model";

describe("migrateDocument", () => {
  const v1 = {
    pages: [{ id: "p1" }, { id: "p2" }],
    blocks: [
      { id: "t", type: "text", pageId: "p1", x: 40, y: 40, width: 200, height: 60, text: "Hello\nWorld", bold: true, align: "center", color: "#2563eb" },
      { id: "tb", type: "table", pageId: "p2", rows: 2, cols: 2, data: [["a"]] },
      { id: "s", type: "shape", shapeType: "circle", x: 1, y: 2 },
    ],
    annotations: [
      { color: "#f00", width: 3, points: [{ x: 10, y: PAGE_STEP + 50, pressure: 0.7 }, { x: 20, y: PAGE_STEP + 60 }] },
      { isEraser: true, points: [{ x: 1, y: 1 }] },
    ],
    ink: [
      { type: "freedraw", x: 100, y: 200, points: [[0, 0], [5, 5]], pressures: [0.4, 0.6], strokeColor: "#000", strokeWidth: 2 },
      { type: "freedraw", isDeleted: true, x: 0, y: 0, points: [[0, 0]] },
      { type: "rectangle", x: 0, y: 0 },
    ],
  };
  const v2 = migrateDocument(v1);

  it("converts text to rich text with marks and alignment", () => {
    const text = v2.blocks.find((block) => block.id === "t");
    expect(text.text).toBeUndefined();
    expect(docToText(text.doc)).toBe("Hello\nWorld");
    expect(text.doc.content[0].attrs.textAlign).toBe("center");
    expect(text.doc.content[0].content[0].marks.map((mark) => mark.type)).toEqual(["bold", "textStyle"]);
  });

  it("pads table data to its size", () => {
    expect(v2.blocks.find((block) => block.id === "tb").data).toEqual([["a", ""], ["", ""]]);
  });

  it("keeps saved ink and converts legacy canvas annotations into freedraw elements", () => {
    expect(v2.ink.map((element) => element.type)).toEqual(["freedraw", "rectangle", "freedraw"]);
    const converted = v2.ink[2];
    expect(converted).toMatchObject({ x: 10, y: PAGE_STEP + 50, width: 10, height: 10, strokeColor: "#f00", strokeWidth: 3, isDeleted: false });
    expect(converted.points).toEqual([[0, 0], [10, 10]]);
    expect(converted.pressures).toEqual([0.7, 0.5]);
  });

  it("keeps v2 content and repairs empty documents", () => {
    expect(migrateDocument(v2)).toEqual(v2);
    expect(migrateDocument(null).pages).toHaveLength(1);
    expect(migrateDocument({ version: 2, pages: [], blocks: null }).pages).toHaveLength(1);
  });
});

describe("page operations", () => {
  const content = {
    version: 2,
    pages: [{ id: "a" }, { id: "b" }, { id: "c" }],
    blocks: [{ id: 1, pageId: "a" }, { id: 2, pageId: "b" }],
    ink: [{ id: "i1", y: 10 }, { id: "i2", y: PAGE_STEP + 10 }, { id: "i3", y: 2 * PAGE_STEP + 10 }],
  };
  it("deletes a page with its blocks and ink, moving later ink up", () => {
    const next = deletePage(content, "b");
    expect(next.pages.map((p) => p.id)).toEqual(["a", "c"]);
    expect(next.blocks.map((b) => b.id)).toEqual([1]);
    expect(next.ink).toEqual([{ id: "i1", y: 10 }, { id: "i3", y: PAGE_STEP + 10 }]);
    const single = { ...content, pages: [{ id: "a" }] };
    expect(deletePage(single, "a")).toBe(single);
  });
  it("moves pages and their ink", () => {
    const next = movePage(content, "a", 1);
    expect(next.pages.map((p) => p.id)).toEqual(["b", "a", "c"]);
    expect(next.ink.map((element) => element.y)).toEqual([PAGE_STEP + 10, 10, 2 * PAGE_STEP + 10]);
    expect(movePage(content, "a", -1)).toBe(content);
  });
});

describe("rich text helpers and templates", () => {
  it("round-trips plain text", () => {
    expect(docToText(textToDoc("one\n\nthree"))).toBe("one\n\nthree");
  });
  it("builds every template", () => {
    for (const template of TEMPLATES) {
      const content = template.build();
      expect(content.version).toBe(2);
      for (const block of content.blocks) expect(block.pageId).toBe(content.pages[0].id);
    }
  });
});
