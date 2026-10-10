import { makeEdge, makeNode, nodesInLane, uid } from "./model";

// Supported subset of Mermaid flowcharts:
//   flowchart|graph TD|TB|BT|LR|RL
//   A[Process]  A(Rounded)  A([Start/end])  A((Circle))  A{Decision}
//   A[(Store)]  A[/Data/]  A[\Data\]  A[[External]]  A>Note]
//   A --> B   A --- B   A -.-> B   A ==> B   A -->|label| B   A -- label --> B
//   A -.label.-> B   A & B --> C   A --> B --> C
//   subgraph id [Title] … end   (becomes a swimlane)
//   %% comments; style/classDef/class/linkStyle/click lines are ignored.

const SHAPES = [
  { open: "([", close: "])", kind: "terminator" },
  { open: "[(", close: ")]", kind: "store" },
  { open: "[[", close: "]]", kind: "external" },
  { open: "((", close: "))", kind: "terminator" },
  { open: "[/", close: "/]", kind: "data" },
  { open: "[\\", close: "\\]", kind: "data" },
  { open: "[/", close: "\\]", kind: "data" },
  { open: "[", close: "]", kind: "process" },
  { open: "(", close: ")", kind: "process" },
  { open: "{", close: "}", kind: "decision" },
  { open: ">", close: "]", kind: "note" },
];

const EXPORT_SHAPE = {
  process: ["[", "]"],
  terminator: ["([", "])"],
  decision: ["{", "}"],
  store: ["[(", ")]"],
  data: ["[/", "/]"],
  external: ["[[", "]]"],
  note: [">", "]"],
  document: ["[", "]"],
};

// Edge operators, most specific first. `label` captures a mid-arrow label.
const EDGE_PATTERNS = [
  { re: /^-->\|([^|]*)\|/, style: "solid" },
  { re: /^---\|([^|]*)\|/, style: "solid" },
  { re: /^-\.->\|([^|]*)\|/, style: "dashed" },
  { re: /^==>\|([^|]*)\|/, style: "solid" },
  { re: /^--\s+(.+?)\s+-->/, style: "solid" },
  { re: /^--\s+(.+?)\s+---/, style: "solid" },
  { re: /^-\.\s*(.+?)\s*\.->/, style: "dashed" },
  { re: /^==\s+(.+?)\s+==>/, style: "solid" },
  { re: /^-\.->/, style: "dashed" },
  { re: /^-\.-/, style: "dashed" },
  { re: /^==>/, style: "solid" },
  { re: /^===/, style: "solid" },
  { re: /^--[>ox]/, style: "solid" },
  { re: /^---/, style: "solid" },
];

const IGNORED = /^(style|classDef|class|linkStyle|click|direction)\b/;

function cleanLabel(raw) {
  let text = raw.trim();
  if (text.startsWith('"') && text.endsWith('"') && text.length >= 2) text = text.slice(1, -1);
  return text.replace(/#quot;/g, '"').replace(/<br\s*\/?>/gi, "\n").trim();
}

function readNode(text, index) {
  const idMatch = /^[A-Za-z0-9_][\w-]*/.exec(text.slice(index));
  if (!idMatch) return null;
  let cursor = index + idMatch[0].length;
  const id = idMatch[0];
  for (const shape of SHAPES) {
    if (!text.startsWith(shape.open, cursor)) continue;
    const start = cursor + shape.open.length;
    // Quoted labels may contain closing brackets.
    let end;
    if (text[start] === '"') {
      const quoteEnd = text.indexOf('"', start + 1);
      end = quoteEnd >= 0 ? text.indexOf(shape.close, quoteEnd) : -1;
    } else {
      end = text.indexOf(shape.close, start);
    }
    if (end < 0) continue;
    return { id, label: cleanLabel(text.slice(start, end)), kind: shape.kind, next: end + shape.close.length };
  }
  return { id, label: null, kind: null, next: cursor };
}

function readNodeGroup(text, index) {
  const nodes = [];
  let cursor = index;
  for (;;) {
    const node = readNode(text, cursor);
    if (!node) return nodes.length ? { nodes, next: cursor } : null;
    nodes.push(node);
    cursor = node.next;
    const amp = /^\s*&\s*/.exec(text.slice(cursor));
    if (!amp) return { nodes, next: cursor };
    cursor += amp[0].length;
  }
}

function readEdge(text, index) {
  const rest = text.slice(index);
  for (const pattern of EDGE_PATTERNS) {
    const match = pattern.re.exec(rest);
    if (match) return { label: match[1] ? cleanLabel(match[1]) : "", style: pattern.style, next: index + match[0].length };
  }
  return null;
}

/**
 * Split into statements: newlines always, ";" only outside quoted labels and
 * not as the end of an entity such as #quot; — keeps the original line number.
 */
function splitStatements(source) {
  const statements = [];
  String(source ?? "").replace(/\r/g, "").split("\n").forEach((line, index) => {
    let current = "";
    let quoted = false;
    for (const char of line) {
      if (char === '"') quoted = !quoted;
      if (char === ";" && !quoted && !/#[a-z0-9]+$/i.test(current)) {
        statements.push({ text: current, line: index + 1 });
        current = "";
      } else {
        current += char;
      }
    }
    statements.push({ text: current, line: index + 1 });
  });
  return statements;
}

/** Parse Mermaid flowchart text → { scene, direction, warnings, errors }. */
export function parseMermaid(source) {
  const lines = splitStatements(source);
  const nodes = new Map(); // mermaid id → node
  const edges = [];
  const lanes = []; // { id, label, members: Set }
  const laneStack = [];
  const errors = [];
  const warnings = [];
  let direction = "TB";
  let sawHeader = false;

  const ensureNode = (ref) => {
    let node = nodes.get(ref.id);
    if (!node) {
      node = makeNode(ref.kind ?? "process", { x: 0, y: 0 }, { id: uid("n"), label: ref.label ?? ref.id });
      node.mermaidId = ref.id;
      nodes.set(ref.id, node);
    } else if (ref.label != null) {
      node.data = { ...node.data, label: ref.label, kind: ref.kind ?? node.data.kind };
    }
    const lane = laneStack[laneStack.length - 1];
    if (lane) lane.members.add(ref.id);
    return node;
  };

  lines.forEach(({ text: rawLine, line: lineNo }) => {
    const line = rawLine.replace(/%%.*$/, "").trim();
    if (!line) return;

    const header = /^(flowchart|graph)\s*(TD|TB|BT|LR|RL)?\s*$/i.exec(line);
    if (header) {
      sawHeader = true;
      const dir = (header[2] || "TB").toUpperCase();
      direction = dir === "TD" ? "TB" : dir;
      return;
    }
    if (IGNORED.test(line)) { warnings.push(`Line ${lineNo}: "${line.split(/\s/)[0]}" styling is ignored.`); return; }
    const subgraph = /^subgraph\s+([^\s[]+)?\s*(?:\[(.+)\])?\s*$/i.exec(line);
    if (subgraph) {
      const label = cleanLabel(subgraph[2] ?? subgraph[1] ?? "Lane");
      const lane = { id: subgraph[1] ?? `lane${lanes.length + 1}`, label, members: new Set() };
      lanes.push(lane);
      laneStack.push(lane);
      return;
    }
    if (/^end$/i.test(line)) {
      if (!laneStack.length) errors.push(`Line ${lineNo}: "end" without a matching "subgraph".`);
      laneStack.pop();
      return;
    }

    let cursor = 0;
    const first = readNodeGroup(line, cursor);
    if (!first) { errors.push(`Line ${lineNo}: couldn't read "${line}".`); return; }
    let previous = first.nodes.map(ensureNode);
    cursor = first.next;
    for (;;) {
      const space = /^\s*/.exec(line.slice(cursor))[0].length;
      cursor += space;
      if (cursor >= line.length) break;
      const edge = readEdge(line, cursor);
      if (!edge) { errors.push(`Line ${lineNo}: unexpected "${line.slice(cursor)}".`); return; }
      cursor = edge.next + /^\s*/.exec(line.slice(edge.next))[0].length;
      const group = readNodeGroup(line, cursor);
      if (!group) { errors.push(`Line ${lineNo}: an arrow must point to a node.`); return; }
      const targets = group.nodes.map(ensureNode);
      for (const from of previous) for (const to of targets) edges.push(makeEdge(from.id, to.id, { label: edge.label, style: edge.style }));
      previous = targets;
      cursor = group.next;
    }
  });

  if (!sawHeader && (nodes.size || edges.length)) warnings.push('No "flowchart TD" / "graph LR" header — assumed top-to-bottom.');
  if (laneStack.length) errors.push(`"subgraph ${laneStack[laneStack.length - 1].id}" is missing its "end".`);

  // Lanes: stack them; member nodes are placed inside (layout tidies them later).
  const laneNodes = lanes.map((lane, index) => makeNode("lane", { x: 0, y: index * 220 }, { id: uid("lane"), label: lane.label }));
  lanes.forEach((lane, index) => {
    let x = 200;
    for (const memberId of lane.members) {
      const node = nodes.get(memberId);
      node.position = { x, y: laneNodes[index].position.y + 50 };
      x += node.width + 60;
    }
  });

  const sceneNodes = [...laneNodes, ...[...nodes.values()].map(({ mermaidId, ...node }) => node)];
  return { scene: { version: 2, diagramType: lanes.length ? "swimlane" : "flow", nodes: sceneNodes, edges }, direction, warnings, errors };
}

function quote(label) {
  return `"${String(label ?? "").replace(/"/g, "#quot;").replace(/\n/g, "<br>")}"`;
}

/** Serialise a scene to Mermaid flowchart text. Lanes become subgraphs. */
export function toMermaid(scene, direction = "TD") {
  const shapes = scene.nodes.filter((node) => node.type !== "lane");
  const lanes = scene.nodes.filter((node) => node.type === "lane").sort((a, b) => a.position.y - b.position.y);
  const ids = new Map(shapes.map((node, index) => [node.id, `n${index + 1}`]));
  const decl = (node) => {
    const [open, close] = EXPORT_SHAPE[node.data.kind] ?? EXPORT_SHAPE.process;
    return `${ids.get(node.id)}${open}${quote(node.data.label)}${close}`;
  };

  const lines = [`flowchart ${direction === "TB" ? "TD" : direction}`];
  const placed = new Set();
  lanes.forEach((lane, index) => {
    const members = nodesInLane(lane, shapes).filter((node) => !placed.has(node.id));
    lines.push(`  subgraph lane${index + 1}[${quote(lane.data.label)}]`);
    for (const node of members) { lines.push(`    ${decl(node)}`); placed.add(node.id); }
    lines.push("  end");
  });
  for (const node of shapes) if (!placed.has(node.id)) lines.push(`  ${decl(node)}`);
  for (const edge of scene.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) continue;
    const arrow = edge.data?.style === "dashed" ? "-.->" : "-->";
    const label = edge.label ? `|${String(edge.label).replace(/\|/g, "/").replace(/\n/g, " ")}|` : "";
    lines.push(`  ${ids.get(edge.source)} ${arrow}${label} ${ids.get(edge.target)}`);
  }
  return lines.join("\n");
}
