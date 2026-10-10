// Flow scenes use React Flow's own node/edge shape (version 2):
//   node: { id, type: "shape" | "lane", position: {x, y}, width, height, data: { kind, label, color } }
//   edge: { id, source, target, sourceHandle, targetHandle, type, label, data: { style } }
// Lanes are background regions; nodes inside a lane move with it.

export const NODE_COLORS = [
  { id: "blue", label: "Blue", accent: "#2563eb", surface: "#eff6ff" },
  { id: "violet", label: "Violet", accent: "#7c3aed", surface: "#f5f3ff" },
  { id: "emerald", label: "Green", accent: "#059669", surface: "#ecfdf5" },
  { id: "amber", label: "Amber", accent: "#d97706", surface: "#fffbeb" },
  { id: "rose", label: "Rose", accent: "#e11d48", surface: "#fff1f2" },
  { id: "slate", label: "Slate", accent: "#475569", surface: "#f8fafc" },
];

export const toneOf = (colorId) => NODE_COLORS.find((color) => color.id === colorId) ?? NODE_COLORS[0];

export const NODE_KINDS = [
  { kind: "terminator", label: "Start / end", hint: "Where the flow begins or finishes.", width: 160, height: 60, color: "blue" },
  { kind: "process", label: "Process", hint: "A step, task or system action.", width: 190, height: 72, color: "blue" },
  { kind: "decision", label: "Decision", hint: "A yes / no or branching rule.", width: 150, height: 110, color: "amber" },
  { kind: "data", label: "Data in / out", hint: "Data entering or leaving a process.", width: 200, height: 70, color: "emerald" },
  { kind: "store", label: "Data store", hint: "A database, file or durable store.", width: 180, height: 84, color: "emerald" },
  { kind: "document", label: "Document", hint: "A report, form or file.", width: 180, height: 84, color: "rose" },
  { kind: "external", label: "External entity", hint: "A person, team or system outside the flow.", width: 180, height: 70, color: "violet" },
  { kind: "note", label: "Note", hint: "A comment or assumption.", width: 200, height: 96, color: "amber" },
  { kind: "lane", label: "Swimlane", hint: "A role or system's area of responsibility.", width: 1100, height: 180, color: "slate" },
];

export const kindInfo = (kind) => NODE_KINDS.find((item) => item.kind === kind) ?? NODE_KINDS[1];

export const EDGE_TYPES = [
  { id: "smoothstep", label: "Rounded elbow" },
  { id: "step", label: "Elbow" },
  { id: "straight", label: "Straight" },
  { id: "default", label: "Curved" },
];

let counter = 0;
export const uid = (prefix = "n") => {
  counter += 1;
  return typeof crypto !== "undefined" && crypto.randomUUID ? `${prefix}-${crypto.randomUUID().slice(0, 8)}` : `${prefix}-${Date.now().toString(36)}-${counter}`;
};

export function makeNode(kind, position, overrides = {}) {
  const info = kindInfo(kind);
  return {
    id: overrides.id ?? uid(kind === "lane" ? "lane" : "n"),
    type: kind === "lane" ? "lane" : "shape",
    position: { x: Math.round(position.x), y: Math.round(position.y) },
    width: overrides.width ?? info.width,
    height: overrides.height ?? info.height,
    ...(kind === "lane" ? { zIndex: -1 } : {}),
    data: { kind, label: overrides.label ?? (kind === "lane" ? "Role / system" : info.label), color: overrides.color ?? info.color },
  };
}

export function makeEdge(source, target, { label = "", style = "solid", type = "smoothstep", sourceHandle = null, targetHandle = null, id } = {}) {
  return { id: id ?? uid("e"), source, target, sourceHandle, targetHandle, type, label, data: { style } };
}

export function emptyScene(diagramType = "blank") {
  return { version: 2, diagramType, nodes: [], edges: [] };
}

/** Converts the old fixed-canvas format ({ nodes: [{x, y, width, height, type, label, color}], edges }) to v2. */
export function migrateFlow(input) {
  const source = input?.scene ?? input;
  if (!source || !Array.isArray(source.nodes) || !Array.isArray(source.edges)) return emptyScene();
  if (source.version === 2) return { ...emptyScene(source.diagramType), ...source };
  const nodes = source.nodes.map((node) => makeNode(node.type || "process", { x: node.x ?? 0, y: node.y ?? 0 }, { id: node.id, width: node.width, height: node.height, label: node.label, color: node.color }));
  const ids = new Set(nodes.map((node) => node.id));
  const edges = source.edges
    .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
    .map((edge) => makeEdge(edge.source, edge.target, { id: edge.id, label: edge.label ?? "", style: edge.style === "dashed" ? "dashed" : "solid" }));
  return { version: 2, diagramType: source.diagramType || "blank", nodes, edges };
}

/** Nodes (not lanes) whose centre lies inside the lane. */
export function nodesInLane(lane, nodes) {
  const { x, y } = lane.position;
  return nodes.filter((node) => {
    if (node.type === "lane") return false;
    const cx = node.position.x + (node.width ?? 0) / 2;
    const cy = node.position.y + (node.height ?? 0) / 2;
    return cx >= x && cx <= x + lane.width && cy >= y && cy <= y + lane.height;
  });
}

// ─── Templates (laid out by layout.js on creation) ─────────────────────────

const n = (id, kind, label, color) => makeNode(kind, { x: 0, y: 0 }, { id, label, ...(color ? { color } : {}) });
const e = (source, target, label = "", style = "solid") => makeEdge(source, target, { label, style });

export const TEMPLATES = [
  { id: "blank", label: "Blank canvas", description: "Start from an empty diagram.", title: "Untitled flow", direction: "TB", build: () => emptyScene() },
  {
    id: "flow", label: "Process flow", description: "Steps, decisions and outcomes.", title: "Process flow", direction: "TB",
    build: () => ({
      version: 2, diagramType: "flow",
      nodes: [n("start", "terminator", "Start"), n("capture", "process", "Capture task"), n("ready", "decision", "Ready to plan?"), n("plan", "process", "Create action plan"), n("revise", "process", "Clarify task", "amber"), n("done", "terminator", "Done", "emerald")],
      edges: [e("start", "capture"), e("capture", "ready"), e("ready", "plan", "Yes"), e("ready", "revise", "No"), e("revise", "capture", "updated"), e("plan", "done")],
    }),
  },
  {
    id: "dataflow", label: "Data flow", description: "Entities, processes, stores and the data between them.", title: "Data flow", direction: "LR",
    build: () => ({
      version: 2, diagramType: "dataflow",
      nodes: [n("user", "external", "User"), n("intake", "process", "1. Capture request"), n("store", "store", "Request store"), n("fulfil", "process", "2. Fulfil request"), n("team", "external", "Team")],
      edges: [e("user", "intake", "request"), e("intake", "store", "validated request"), e("store", "fulfil", "queued request"), e("fulfil", "team", "assignment"), e("fulfil", "user", "status update", "dashed")],
    }),
  },
  {
    id: "architecture", label: "System map", description: "Services, integrations and storage.", title: "System map", direction: "LR",
    build: () => ({
      version: 2, diagramType: "architecture",
      nodes: [n("user", "external", "User"), n("web", "process", "Web app"), n("api", "process", "API"), n("db", "store", "Database"), n("events", "document", "Notification event")],
      edges: [e("user", "web", "browser"), e("web", "api", "HTTPS"), e("api", "db", "read / write"), e("api", "events", "publish", "dashed")],
    }),
  },
  {
    id: "erd", label: "Data model", description: "Entities and relationships.", title: "Data model", direction: "LR",
    build: () => ({
      version: 2, diagramType: "erd",
      nodes: [
        makeNode("external", { x: 0, y: 0 }, { id: "ws", label: "Workspace\nid (PK)\nowner_id\nname", height: 120, width: 200 }),
        makeNode("external", { x: 0, y: 0 }, { id: "doc", label: "Document\nid (PK)\nworkspace_id (FK)\ntitle", height: 120, width: 220, color: "blue" }),
        makeNode("external", { x: 0, y: 0 }, { id: "block", label: "Block\nid (PK)\ndocument_id (FK)\ntype", height: 120, width: 200, color: "emerald" }),
      ],
      edges: [e("ws", "doc", "1 : N"), e("doc", "block", "1 : N")],
    }),
  },
  {
    id: "swimlane", label: "Swimlanes", description: "Who does what, and where work is handed off.", title: "Responsibility flow", direction: "LR",
    build: () => ({
      version: 2, diagramType: "swimlane",
      nodes: [
        makeNode("lane", { x: 0, y: 0 }, { id: "lane-customer", label: "Customer" }),
        makeNode("lane", { x: 0, y: 220 }, { id: "lane-ops", label: "Operations" }),
        makeNode("lane", { x: 0, y: 440 }, { id: "lane-system", label: "System" }),
        makeNode("process", { x: 200, y: 54 }, { id: "request", label: "Submit request", color: "violet" }),
        makeNode("decision", { x: 460, y: 255 }, { id: "review", label: "Complete?" }),
        makeNode("process", { x: 700, y: 54 }, { id: "clarify", label: "Ask for details", color: "rose" }),
        makeNode("process", { x: 700, y: 494 }, { id: "plan", label: "Build action plan" }),
        makeNode("terminator", { x: 960, y: 500 }, { id: "finish", label: "Ready", color: "emerald" }),
      ],
      edges: [e("request", "review", "request"), e("review", "plan", "Yes"), e("review", "clarify", "No"), e("clarify", "request", "clarified"), e("plan", "finish", "publish")],
    }),
  },
];
