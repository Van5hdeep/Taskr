// Document geometry: CSS pixels at 96 DPI, so a page is a real A4 sheet.
export const A4_WIDTH = 794;
export const A4_HEIGHT = 1123;
export const PAGE_GAP = 28;
export const PAGE_MARGIN = 40;
export const PAGE_STEP = A4_HEIGHT + PAGE_GAP;

export const PAGE_STYLES = [
  { id: "plain", label: "Plain" },
  { id: "lined", label: "Lined" },
  { id: "grid", label: "Grid" },
  { id: "dotted", label: "Dotted" },
];

export const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

export function emptyContent() {
  return { version: 2, pages: [{ id: uid() }], blocks: [], ink: [] };
}

// ─── Rich text helpers (Tiptap JSON) ───────────────────────────────────────

export function textToDoc(text = "", { bold, italic, underline, color, align } = {}) {
  const marks = [];
  if (bold) marks.push({ type: "bold" });
  if (italic) marks.push({ type: "italic" });
  if (underline) marks.push({ type: "underline" });
  if (color && !/^#0{3,6}$/i.test(color)) marks.push({ type: "textStyle", attrs: { color } });
  return {
    type: "doc",
    content: String(text).split("\n").map((line) => ({
      type: "paragraph",
      ...(align && align !== "left" ? { attrs: { textAlign: align } } : {}),
      ...(line ? { content: [{ type: "text", text: line, ...(marks.length ? { marks } : {}) }] } : {}),
    })),
  };
}

export function docToText(doc) {
  if (!doc) return "";
  const lines = [];
  const walk = (node, line) => {
    if (node.type === "text") return line + node.text;
    const inner = (node.content ?? []).reduce((acc, child) => walk(child, acc), "");
    if (["paragraph", "heading", "listItem", "taskItem"].includes(node.type)) { lines.push(inner); return line; }
    return line + inner;
  };
  walk(doc, "");
  return lines.join("\n").trim();
}

// ─── Migration from the localStorage (v1) format ───────────────────────────

function migrateBlock(block, firstPageId) {
  const base = { ...block, pageId: block.pageId || firstPageId };
  if (block.type === "text" && !block.doc) {
    const { text, bold, italic, underline, color, align, ...rest } = base;
    return { ...rest, doc: textToDoc(text, { bold, italic, underline, color, align }) };
  }
  if (block.type === "table") {
    const rows = block.rows || 3;
    const cols = block.cols || 3;
    const data = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => block.data?.[r]?.[c] ?? ""));
    return { ...base, rows, cols, data, headerRow: Boolean(block.headerRow) };
  }
  return base;
}

// ─── Ink (Excalidraw elements, document coordinates) ──────────────────────
//
// Ink is a list of Excalidraw elements positioned in document space: page i
// spans y ∈ [i·PAGE_STEP, i·PAGE_STEP + A4_HEIGHT). Excalidraw's own
// restoreElements() fills in any fields missing from migrated elements.

export function inkPageIndex(element, pageCount) {
  return Math.min(pageCount - 1, Math.max(0, Math.floor((element.y ?? 0) / PAGE_STEP)));
}

const randomInt = () => Math.floor(Math.random() * 2 ** 31);

/** Legacy canvas annotation (absolute points) → Excalidraw freedraw skeleton. */
export function annotationToFreedraw(path) {
  if (path.isEraser || !path.points?.length) return null;
  const x = Math.min(...path.points.map((p) => p.x));
  const y = Math.min(...path.points.map((p) => p.y));
  const width = Math.max(...path.points.map((p) => p.x)) - x;
  const height = Math.max(...path.points.map((p) => p.y)) - y;
  return {
    id: uid(),
    type: "freedraw",
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: path.color || "#1e1e1e",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: path.width || 2,
    strokeStyle: path.dash?.length ? "dashed" : "solid",
    roughness: 0,
    opacity: 100,
    points: path.points.map((p) => [p.x - x, p.y - y]),
    pressures: path.points.map((p) => (Number.isFinite(p.pressure) ? p.pressure : 0.5)),
    simulatePressure: false,
    seed: randomInt(),
    version: 1,
    versionNonce: randomInt(),
    isDeleted: false,
    groupIds: [],
    frameId: null,
    roundness: null,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
  };
}

const liveInk = (elements) => (Array.isArray(elements) ? elements.filter((element) => element && !element.isDeleted) : []);

/** Accepts v1 (localStorage) or v2 content and returns v2. Pure. */
export function migrateDocument(input) {
  if (!input || typeof input !== "object") return emptyContent();
  if (input.version === 2 && Array.isArray(input.pages)) {
    return {
      version: 2,
      pages: input.pages.length ? input.pages : [{ id: uid() }],
      blocks: Array.isArray(input.blocks) ? input.blocks : [],
      ink: liveInk(input.ink),
    };
  }
  const pages = Array.isArray(input.pages) && input.pages.length ? input.pages.map((page) => ({ id: page.id || uid() })) : [{ id: uid() }];
  const blocks = (input.blocks ?? []).map((block) => migrateBlock(block, pages[0].id));
  const ink = [...liveInk(input.ink), ...(input.annotations ?? []).map(annotationToFreedraw).filter(Boolean)];
  return { version: 2, pages, blocks, ink };
}

// ─── Page operations (pure) ────────────────────────────────────────────────

export function deletePage(content, pageId) {
  if (content.pages.length <= 1) return content;
  const index = content.pages.findIndex((page) => page.id === pageId);
  if (index < 0) return content;
  const count = content.pages.length;
  return {
    ...content,
    pages: content.pages.filter((page) => page.id !== pageId),
    blocks: content.blocks.filter((block) => block.pageId !== pageId),
    // Ink on the deleted page goes; ink on later pages moves up one page.
    ink: content.ink
      .filter((element) => inkPageIndex(element, count) !== index)
      .map((element) => (inkPageIndex(element, count) > index ? { ...element, y: element.y - PAGE_STEP } : element)),
  };
}

export function movePage(content, pageId, direction) {
  const index = content.pages.findIndex((page) => page.id === pageId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= content.pages.length) return content;
  const pages = [...content.pages];
  [pages[index], pages[target]] = [pages[target], pages[index]];
  const count = content.pages.length;
  const shift = (target - index) * PAGE_STEP;
  const ink = content.ink.map((element) => {
    const band = inkPageIndex(element, count);
    if (band === index) return { ...element, y: element.y + shift };
    if (band === target) return { ...element, y: element.y - shift };
    return element;
  });
  return { ...content, pages, ink };
}

// ─── Templates ─────────────────────────────────────────────────────────────

function heading(text, level = 1) {
  return { type: "doc", content: [{ type: "heading", attrs: { level }, content: [{ type: "text", text }] }] };
}

function bullets(items) {
  return { type: "doc", content: [{ type: "bulletList", content: items.map((text) => ({ type: "listItem", content: [{ type: "paragraph", ...(text ? { content: [{ type: "text", text }] } : {}) }] })) }] };
}

export const TEMPLATES = [
  { id: "blank", label: "Blank page", description: "An empty A4 sheet.", pageStyle: "plain", build: () => emptyContent() },
  { id: "lined", label: "Lined notes", description: "Ruled paper for writing or handwriting.", pageStyle: "lined", build: () => emptyContent() },
  {
    id: "meeting", label: "Meeting notes", description: "Agenda, notes, decisions and action items.", pageStyle: "plain",
    build: () => {
      const content = emptyContent();
      const pageId = content.pages[0].id;
      const box = (y, h, doc) => ({ id: uid(), type: "text", pageId, x: PAGE_MARGIN, y, width: A4_WIDTH - PAGE_MARGIN * 2, height: h, framed: false, fontSize: 15, doc });
      content.blocks = [
        box(40, 60, heading("Meeting — ")),
        box(110, 40, { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "Date: " }, { type: "text", text: "  ·  " }, { type: "text", marks: [{ type: "bold" }], text: "Attendees: " }] }] }),
        box(170, 40, heading("Agenda", 3)), box(210, 120, bullets(["", "", ""])),
        box(350, 40, heading("Notes", 3)), box(390, 300, bullets([""])),
        box(710, 40, heading("Decisions", 3)), box(750, 110, bullets([""])),
        box(880, 40, heading("Action items", 3)),
        box(920, 160, { type: "doc", content: [{ type: "taskList", content: [1, 2, 3].map(() => ({ type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph" }] })) }] }),
      ];
      return content;
    },
  },
  {
    id: "weekly", label: "Weekly planner", description: "Seven days, priorities and notes.", pageStyle: "plain",
    build: () => {
      const content = emptyContent();
      const pageId = content.pages[0].id;
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      content.blocks = [
        { id: uid(), type: "text", pageId, x: PAGE_MARGIN, y: 40, width: 500, height: 60, framed: false, fontSize: 15, doc: heading("Week of ") },
        { id: uid(), type: "table", pageId, x: PAGE_MARGIN, y: 120, width: A4_WIDTH - PAGE_MARGIN * 2, height: 720, rows: 8, cols: 2, headerRow: true, data: [["Day", "Plan"], ...days.map((day) => [day, ""])], fill: "transparent", stroke: "#94a3b8", strokeWidth: 1 },
        { id: uid(), type: "text", pageId, x: PAGE_MARGIN, y: 870, width: A4_WIDTH - PAGE_MARGIN * 2, height: 200, framed: true, fontSize: 14, stroke: "#94a3b8", doc: { type: "doc", content: [{ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Top priorities" }] }, ...bullets(["", "", ""]).content] } },
      ];
      return content;
    },
  },
  {
    id: "cornell", label: "Cornell notes", description: "Cues, notes and a summary — great for study.", pageStyle: "lined",
    build: () => {
      const content = emptyContent();
      const pageId = content.pages[0].id;
      content.blocks = [
        { id: uid(), type: "text", pageId, x: PAGE_MARGIN, y: 30, width: A4_WIDTH - PAGE_MARGIN * 2, height: 56, framed: false, fontSize: 15, doc: heading("Topic: ", 2) },
        { id: uid(), type: "text", pageId, x: PAGE_MARGIN, y: 100, width: 200, height: 780, framed: true, stroke: "#94a3b8", fontSize: 14, doc: { type: "doc", content: [{ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Cues" }] }, { type: "paragraph" }] } },
        { id: uid(), type: "text", pageId, x: 256, y: 100, width: A4_WIDTH - 256 - PAGE_MARGIN, height: 780, framed: true, stroke: "#94a3b8", fontSize: 14, doc: { type: "doc", content: [{ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Notes" }] }, { type: "paragraph" }] } },
        { id: uid(), type: "text", pageId, x: PAGE_MARGIN, y: 900, width: A4_WIDTH - PAGE_MARGIN * 2, height: 180, framed: true, stroke: "#94a3b8", fontSize: 14, doc: { type: "doc", content: [{ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Summary" }] }, { type: "paragraph" }] } },
      ];
      return content;
    },
  },
];
