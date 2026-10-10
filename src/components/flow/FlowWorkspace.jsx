import {
  ArrowRight,
  Check,
  ChevronDown,
  Circle,
  Database,
  Diamond,
  Download,
  FileText,
  GitBranch,
  Grid,
  Loader2,
  MousePointer2,
  Network,
  Plus,
  Redo,
  Save,
  Shapes,
  StickyNote,
  Trash2,
  Undo,
  Workflow,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CANVAS_WIDTH = 1440;
const CANVAS_HEIGHT = 900;
const MAX_HISTORY = 60;

const NODE_COLORS = [
  { id: "blue", label: "Blue", accent: "#2563eb", surface: "#eff6ff" },
  { id: "violet", label: "Violet", accent: "#7c3aed", surface: "#f5f3ff" },
  { id: "emerald", label: "Green", accent: "#059669", surface: "#ecfdf5" },
  { id: "amber", label: "Amber", accent: "#d97706", surface: "#fffbeb" },
  { id: "rose", label: "Rose", accent: "#e11d48", surface: "#fff1f2" },
  { id: "slate", label: "Slate", accent: "#475569", surface: "#f8fafc" },
];

const NODE_LIBRARY = [
  { type: "terminator", label: "Start / end", hint: "Use for the beginning or finish of a flow." },
  { type: "process", label: "Process", hint: "A step, task, or system action." },
  { type: "decision", label: "Decision", hint: "A yes / no or branching rule." },
  { type: "external", label: "External entity", hint: "A person, team, or system outside the flow." },
  { type: "data", label: "Data input / output", hint: "Data entering or leaving a process." },
  { type: "store", label: "Data store", hint: "A database, file, or durable store." },
  { type: "document", label: "Document", hint: "A report, form, or file." },
  { type: "note", label: "Note", hint: "A clarifying comment or assumption." },
  { type: "lane", label: "Swimlane", hint: "A role or system responsibility area." },
];

const NODE_DEFAULTS = {
  terminator: { label: "Start", width: 160, height: 64, color: "blue" },
  process: { label: "New process", width: 220, height: 84, color: "blue" },
  decision: { label: "Decision?", width: 150, height: 118, color: "amber" },
  external: { label: "External entity", width: 190, height: 76, color: "violet" },
  data: { label: "Data input / output", width: 220, height: 76, color: "emerald" },
  store: { label: "Data store", width: 195, height: 90, color: "emerald" },
  document: { label: "Document", width: 195, height: 92, color: "rose" },
  note: { label: "Note", width: 205, height: 110, color: "amber" },
  lane: { label: "Role / system", width: 1280, height: 160, color: "slate" },
};

function storageKey(userId) {
  return "taskr_flow_diagram_" + (userId || "local");
}

function emptyScene(diagramType = "blank") {
  return { diagramType, nodes: [], edges: [] };
}

function cloneScene(scene) {
  return JSON.parse(JSON.stringify(scene));
}

function scenesMatch(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function readFlowDocument(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(userId)) || "null");
    const candidate = saved?.scene || saved;
    if (Array.isArray(candidate?.nodes) && Array.isArray(candidate?.edges)) {
      return {
        title: typeof saved?.title === "string" && saved.title.trim() ? saved.title : "Untitled flow",
        scene: {
          diagramType: candidate.diagramType || "blank",
          nodes: candidate.nodes,
          edges: candidate.edges,
        },
      };
    }
  } catch {
    // A malformed local scene should never stop the editor from opening.
  }
  return { title: "Untitled flow", scene: emptyScene() };
}

function node(id, type, label, x, y, width, height, color) {
  const defaults = NODE_DEFAULTS[type] || NODE_DEFAULTS.process;
  return {
    id,
    type,
    label: label || defaults.label,
    x,
    y,
    width: width || defaults.width,
    height: height || defaults.height,
    color: color || defaults.color,
  };
}

function edge(id, source, target, label, style = "solid") {
  return { id, source, target, label, style };
}

function flowTemplate() {
  return {
    diagramType: "flow",
    nodes: [
      node("flow-start", "terminator", "Start", 80, 160),
      node("flow-capture", "process", "Capture task", 300, 140),
      node("flow-ready", "decision", "Ready to plan?", 590, 120),
      node("flow-save", "process", "Create action plan", 855, 140),
      node("flow-end", "terminator", "Done", 1145, 160),
      node("flow-revise", "process", "Clarify task", 575, 350, 180, 72, "amber"),
    ],
    edges: [
      edge("flow-e1", "flow-start", "flow-capture", "new task"),
      edge("flow-e2", "flow-capture", "flow-ready", "task details"),
      edge("flow-e3", "flow-ready", "flow-save", "Yes"),
      edge("flow-e4", "flow-save", "flow-end", "plan ready"),
      edge("flow-e5", "flow-ready", "flow-revise", "No"),
      edge("flow-e6", "flow-revise", "flow-capture", "updated details"),
    ],
  };
}

function dataFlowTemplate() {
  return {
    diagramType: "dataflow",
    nodes: [
      node("dfd-user", "external", "User", 80, 160, 180, 76, "violet"),
      node("dfd-intake", "process", "1. Capture request", 335, 140, 220, 84, "blue"),
      node("dfd-store", "store", "Request store", 645, 135, 195, 90, "emerald"),
      node("dfd-fulfill", "process", "2. Fulfil request", 930, 140, 220, 84, "blue"),
      node("dfd-team", "external", "Team", 1225, 160, 150, 76, "violet"),
    ],
    edges: [
      edge("dfd-e1", "dfd-user", "dfd-intake", "request details"),
      edge("dfd-e2", "dfd-intake", "dfd-store", "validated request"),
      edge("dfd-e3", "dfd-store", "dfd-fulfill", "queued request"),
      edge("dfd-e4", "dfd-fulfill", "dfd-team", "assignment"),
      edge("dfd-e5", "dfd-fulfill", "dfd-user", "status update", "dashed"),
    ],
  };
}

function architectureTemplate() {
  return {
    diagramType: "architecture",
    nodes: [
      node("arch-user", "external", "User", 90, 160, 170, 76, "violet"),
      node("arch-client", "process", "TASKR web app", 355, 140, 210, 84, "blue"),
      node("arch-api", "process", "Application API", 670, 140, 210, 84, "blue"),
      node("arch-db", "store", "Workspace database", 990, 135, 205, 90, "emerald"),
      node("arch-notice", "document", "Notification event", 975, 350, 205, 92, "rose"),
    ],
    edges: [
      edge("arch-e1", "arch-user", "arch-client", "browser action"),
      edge("arch-e2", "arch-client", "arch-api", "HTTPS request"),
      edge("arch-e3", "arch-api", "arch-db", "read / write"),
      edge("arch-e4", "arch-api", "arch-notice", "publish event", "dashed"),
    ],
  };
}

function sequenceTemplate() {
  return {
    diagramType: "sequence",
    nodes: [
      node("seq-user", "external", "User", 100, 140, 160, 76, "violet"),
      node("seq-app", "process", "Web app", 410, 140, 180, 76, "blue"),
      node("seq-api", "process", "API", 730, 140, 170, 76, "blue"),
      node("seq-db", "store", "Database", 1030, 135, 180, 86, "emerald"),
      node("seq-note", "note", "Connect in the order messages happen.", 560, 540, 280, 105, "amber"),
    ],
    edges: [
      edge("seq-e1", "seq-user", "seq-app", "1. Submit"),
      edge("seq-e2", "seq-app", "seq-api", "2. POST /tasks"),
      edge("seq-e3", "seq-api", "seq-db", "3. Save"),
      edge("seq-e4", "seq-db", "seq-api", "4. Record"),
      edge("seq-e5", "seq-api", "seq-app", "5. Success"),
      edge("seq-e6", "seq-app", "seq-user", "6. Updated view"),
    ],
  };
}

function erdTemplate() {
  return {
    diagramType: "erd",
    nodes: [
      node("erd-workspace", "external", "Workspace\nid (PK)\nowner_id\nname", 220, 160, 230, 150, "violet"),
      node("erd-document", "external", "Document\nid (PK)\nworkspace_id (FK)\ntitle", 650, 160, 250, 150, "blue"),
      node("erd-block", "external", "Block\nid (PK)\ndocument_id (FK)\ntype", 1110, 160, 230, 150, "emerald"),
    ],
    edges: [
      edge("erd-e1", "erd-workspace", "erd-document", "1 : N"),
      edge("erd-e2", "erd-document", "erd-block", "1 : N"),
    ],
  };
}

function swimlaneTemplate() {
  return {
    diagramType: "swimlane",
    nodes: [
      node("lane-user", "lane", "Customer", 60, 100, 1320, 165, "slate"),
      node("lane-team", "lane", "Operations team", 60, 315, 1320, 165, "slate"),
      node("lane-system", "lane", "TASKR", 60, 530, 1320, 165, "slate"),
      node("lane-request", "process", "Submit request", 180, 145, 195, 76, "violet"),
      node("lane-review", "decision", "Complete?", 520, 337, 145, 112, "amber"),
      node("lane-clarify", "process", "Ask for details", 835, 145, 195, 76, "rose"),
      node("lane-plan", "process", "Build action plan", 930, 574, 205, 76, "blue"),
      node("lane-finish", "terminator", "Ready", 1180, 580, 145, 64, "emerald"),
    ],
    edges: [
      edge("lane-e1", "lane-request", "lane-review", "request"),
      edge("lane-e2", "lane-review", "lane-plan", "Yes"),
      edge("lane-e3", "lane-review", "lane-clarify", "No"),
      edge("lane-e4", "lane-clarify", "lane-request", "clarified request"),
      edge("lane-e5", "lane-plan", "lane-finish", "publish"),
    ],
  };
}

const TEMPLATES = [
  { id: "blank", label: "Blank canvas", description: "Start from an empty diagram.", icon: Plus, title: "Untitled flow", create: () => emptyScene() },
  { id: "flow", label: "Process flow", description: "Steps, decisions, and outcomes.", icon: Workflow, title: "Task flow", create: flowTemplate },
  { id: "dataflow", label: "Data flow", description: "Entities, processes, stores, and payloads.", icon: Network, title: "Request data flow", create: dataFlowTemplate },
  { id: "architecture", label: "System map", description: "Services, integrations, and storage.", icon: GitBranch, title: "System flow", create: architectureTemplate },
  { id: "sequence", label: "Interaction flow", description: "Requests and responses between participants.", icon: ArrowRight, title: "Interaction flow", create: sequenceTemplate },
  { id: "erd", label: "Data model", description: "Entities and relationships.", icon: Database, title: "Data model", create: erdTemplate },
  { id: "swimlane", label: "Swimlane flow", description: "Roles, handoffs, and responsibility.", icon: Grid, title: "Responsibility flow", create: swimlaneTemplate },
];

function NodeTypeIcon({ type, className = "h-4 w-4" }) {
  const Icon = {
    terminator: Circle,
    process: Shapes,
    decision: Diamond,
    external: Shapes,
    data: ArrowRight,
    store: Database,
    document: FileText,
    note: StickyNote,
    lane: Grid,
  }[type] || Shapes;
  return <Icon className={className} />;
}

function getTone(colorId) {
  return NODE_COLORS.find((color) => color.id === colorId) || NODE_COLORS[0];
}

function nodeAnchor(source, target) {
  const sourceCenterX = source.x + source.width / 2;
  const sourceCenterY = source.y + source.height / 2;
  const targetCenterX = target.x + target.width / 2;
  const targetCenterY = target.y + target.height / 2;
  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: source.x + (dx >= 0 ? source.width : 0), y: sourceCenterY };
  }
  return { x: sourceCenterX, y: source.y + (dy >= 0 ? source.height : 0) };
}

function buildEdgePath(source, target) {
  // Return paths travel below participants instead of obscuring forward arrows.
  if (target.x < source.x && Math.abs(target.y - source.y) < 100) {
    const sx = source.x + source.width / 2;
    const tx = target.x + target.width / 2;
    const sy = source.y + source.height;
    const ty = target.y + target.height;
    const bottom = Math.max(sy, ty) + 85 + Math.abs(sx - tx) * 0.06;
    return { d: `M ${sx} ${sy} V ${bottom} H ${tx} V ${ty}`, labelX: (sx + tx) / 2, labelY: bottom };
  }
  const start = nodeAnchor(source, target);
  const end = nodeAnchor(target, source);
  const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
  if (horizontal) {
    const middleX = Math.round((start.x + end.x) / 2);
    return {
      d: "M " + start.x + " " + start.y + " H " + middleX + " V " + end.y + " H " + end.x,
      labelX: middleX,
      labelY: Math.round((start.y + end.y) / 2),
    };
  }
  const middleY = Math.round((start.y + end.y) / 2);
  return {
    d: "M " + start.x + " " + start.y + " V " + middleY + " H " + end.x + " V " + end.y,
    labelX: Math.round((start.x + end.x) / 2),
    labelY: middleY,
  };
}

function escapeXml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function exportText(label, x, y, width, fontSize = 16, weight = 600) {
  const lines = String(label || "").split("\\n");
  const lineHeight = fontSize * 1.35;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  return `<text x="${x}" y="${startY}" text-anchor="middle" fill="#1e293b" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="${weight}">${lines.map((line, index) => `<tspan x="${x}" dy="${index ? lineHeight : 0}">${escapeXml(line)}</tspan>`).join("")}</text>`;
}

function exportNodeMarkup(item) {
  const tone = getTone(item.color);
  const cx = item.x + item.width / 2;
  const cy = item.y + item.height / 2;
  const radius = item.type === "terminator" ? item.height / 2 : 16;
  let surface;
  if (item.type === "lane") {
    surface = `<rect x="${item.x}" y="${item.y}" width="${item.width}" height="${item.height}" rx="18" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="8 7"/>`;
  } else if (item.type === "decision" || item.type === "data") {
    const points = item.type === "decision"
      ? `${cx},${item.y + 2} ${item.x + item.width - 2},${cy} ${cx},${item.y + item.height - 2} ${item.x + 2},${cy}`
      : `${item.x + item.width * 0.12},${item.y + 2} ${item.x + item.width - 2},${item.y + 2} ${item.x + item.width * 0.88},${item.y + item.height - 2} ${item.x + 2},${item.y + item.height - 2}`;
    surface = `<polygon points="${points}" fill="${tone.surface}" stroke="${tone.accent}" stroke-width="3" stroke-linejoin="round"/>`;
  } else if (item.type === "store") {
    surface = `<rect x="${item.x + 2}" y="${item.y + 8}" width="${item.width - 4}" height="${item.height - 16}" rx="18" fill="${tone.surface}" stroke="${tone.accent}" stroke-width="3"/><ellipse cx="${cx}" cy="${item.y + 10}" rx="${item.width / 2 - 2}" ry="16" fill="${tone.surface}" stroke="${tone.accent}" stroke-width="3"/>`;
  } else if (item.type === "document") {
    const fold = Math.min(28, item.width * 0.18);
    surface = `<path d="M ${item.x + radius} ${item.y} H ${item.x + item.width - fold} L ${item.x + item.width} ${item.y + fold} V ${item.y + item.height - radius} Q ${item.x + item.width} ${item.y + item.height} ${item.x + item.width - radius} ${item.y + item.height} H ${item.x + radius} Q ${item.x} ${item.y + item.height} ${item.x} ${item.y + item.height - radius} V ${item.y + radius} Q ${item.x} ${item.y} ${item.x + radius} ${item.y} Z" fill="${tone.surface}" stroke="${tone.accent}" stroke-width="3"/><path d="M ${item.x + item.width - fold} ${item.y} V ${item.y + fold} H ${item.x + item.width}" fill="none" stroke="${tone.accent}" stroke-width="3"/>`;
  } else if (item.type === "note") {
    surface = `<rect x="${item.x}" y="${item.y}" width="${item.width}" height="${item.height}" rx="9" fill="${tone.surface}" stroke="${tone.accent}" stroke-width="3"/><path d="M ${item.x} ${item.y + 23} H ${item.x + item.width}" stroke="${tone.accent}" stroke-width="2" stroke-dasharray="6 5"/>`;
  } else {
    const stroke = item.type === "external" ? 5 : 3;
    const dash = item.type === "external" ? ` stroke-dasharray="${item.width > 180 ? "0" : "0"}"` : "";
    surface = `<rect x="${item.x + stroke / 2}" y="${item.y + stroke / 2}" width="${item.width - stroke}" height="${item.height - stroke}" rx="${item.type === "terminator" ? item.height / 2 : 16}" fill="${tone.surface}" stroke="${tone.accent}" stroke-width="${stroke}"${dash}/>`;
    if (item.type === "external") {
      surface += `<rect x="${item.x + 7}" y="${item.y + 7}" width="${item.width - 14}" height="${item.height - 14}" rx="${Math.max(8, item.height / 2 - 7)}" fill="none" stroke="${tone.accent}" stroke-width="2"/>`;
    }
  }
  const labelMarkup = item.type === "lane"
    ? `<text x="${item.x + 24}" y="${item.y + 35}" fill="#64748b" font-family="Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="2">${escapeXml(item.label)}</text>`
    : exportText(item.label, cx, cy, item.width, item.type === "note" ? 14 : 15);
  return surface + labelMarkup;
}

function sceneToSvg(scene, title) {
  const nodeMap = new Map(scene.nodes.map((item) => [item.id, item]));
  const edges = scene.edges.map((item) => {
    const source = nodeMap.get(item.source);
    const target = nodeMap.get(item.target);
    if (!source || !target) return "";
    const path = buildEdgePath(source, target);
    const label = item.label || "";
    const labelWidth = Math.max(64, Math.min(300, label.length * 9 + 24));
    return `<path d="${path.d}" fill="none" stroke="#64748b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"${item.style === "dashed" ? ' stroke-dasharray="10 8"' : ""} marker-end="url(#taskr-export-arrow)"/>${label ? `<rect x="${path.labelX - labelWidth / 2}" y="${path.labelY - 17}" width="${labelWidth}" height="34" rx="9" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>${exportText(label, path.labelX, path.labelY, labelWidth, 13, 600)}` : ""}`;
  }).join("");
  const nodes = [...scene.nodes].sort((a, b) => (a.type === "lane" ? -1 : 1) - (b.type === "lane" ? -1 : 1)).map(exportNodeMarkup).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}"><title>${escapeXml(title || "TASKR flow diagram")}</title><defs><marker id="taskr-export-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/></marker></defs><rect width="100%" height="100%" fill="#ffffff"/>${edges}${nodes}</svg>`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function jpegToPdf(jpegDataUrl, width, height) {
  const jpegBytes = Uint8Array.from(atob(jpegDataUrl.split(",")[1]), (char) => char.charCodeAt(0));
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 18;
  const scale = Math.min((pageWidth - margin * 2) / width, (pageHeight - margin * 2) / height);
  const imageWidth = width * scale;
  const imageHeight = height * scale;
  const imageX = (pageWidth - imageWidth) / 2;
  const imageY = (pageHeight - imageHeight) / 2;
  const content = `q\n${imageWidth.toFixed(2)} 0 0 ${imageHeight.toFixed(2)} ${imageX.toFixed(2)} ${imageY.toFixed(2)} cm\n/Im0 Do\nQ\n`;
  const objectTexts = [
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>\nendobj\n`,
    `4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`,
  ];
  const encoder = new TextEncoder();
  const chunks = [encoder.encode("%PDF-1.4\n")];
  const offsets = [0];
  let byteLength = chunks[0].length;
  objectTexts.forEach((objectText) => {
    offsets.push(byteLength);
    const bytes = encoder.encode(objectText);
    chunks.push(bytes);
    byteLength += bytes.length;
  });
  offsets.push(byteLength);
  const imageHeader = encoder.encode(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
  const imageFooter = encoder.encode("\nendstream\nendobj\n");
  chunks.push(imageHeader, jpegBytes, imageFooter);
  byteLength += imageHeader.length + jpegBytes.length + imageFooter.length;
  const xrefOffset = byteLength;
  const xref = `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(encoder.encode(xref));
  return new Blob(chunks, { type: "application/pdf" });
}

async function exportScene(scene, title, format) {
  const svg = sceneToSvg(scene, title);
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const image = new Image();
  image.decoding = "async";
  image.src = svgUrl;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.94);
  const filenameBase = (title || "taskr-flow").trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "taskr-flow";
  if (format === "pdf") downloadBlob(jpegToPdf(jpegDataUrl, CANVAS_WIDTH, CANVAS_HEIGHT), `${filenameBase}.pdf`);
  else downloadBlob(await (await fetch(jpegDataUrl)).blob(), `${filenameBase}.jpg`);
}

function FlowEdges({ nodes, edges, selectedEdgeId, onSelectEdge }) {
  const nodeMap = useMemo(() => new Map(nodes.map((item) => [item.id, item])), [nodes]);
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2] h-full w-full overflow-visible" viewBox={"0 0 " + CANVAS_WIDTH + " " + CANVAS_HEIGHT}>
      <defs>
        <marker id="taskr-flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>
      {edges.map((item) => {
        const source = nodeMap.get(item.source);
        const target = nodeMap.get(item.target);
        if (!source || !target) return null;
        const path = buildEdgePath(source, target);
        const selected = selectedEdgeId === item.id;
        const label = item.label || "";
        const labelWidth = Math.max(44, Math.min(230, label.length * 7 + 20));
        return (
          <g key={item.id} className="pointer-events-auto">
            <path
              d={path.d}
              fill="none"
              stroke={selected ? "#2563eb" : "#64748b"}
              strokeWidth={selected ? 3 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={item.style === "dashed" ? "7 6" : undefined}
              markerEnd="url(#taskr-flow-arrow)"
              className="transition-colors"
              style={{ color: selected ? "#2563eb" : "#64748b" }}
            />
            <path
              d={path.d}
              fill="none"
              stroke="transparent"
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-auto"
              onPointerDown={(event) => {
                event.stopPropagation();
                onSelectEdge(item.id);
              }}
              style={{ cursor: "pointer" }}
            />
            {label && (
              <g className="pointer-events-none">
                <rect x={path.labelX - labelWidth / 2} y={path.labelY - 13} width={labelWidth} height="26" rx="7" fill="#ffffff" stroke={selected ? "#93c5fd" : "#e2e8f0"} />
                <text x={path.labelX} y={path.labelY + 4} textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">{label}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function NodeLabel({ node, editing, onChange, onFinishEdit }) {
  if (editing) {
    return (
      <input
        autoFocus
        aria-label="Node label"
        className="relative z-10 w-full rounded-md border border-blue-400 bg-white px-2 py-1 text-center text-xs font-semibold text-slate-800 outline-none ring-2 ring-blue-100"
        value={node.label}
        onPointerDown={(event) => event.stopPropagation()}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onFinishEdit}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "Escape") {
            event.preventDefault();
            onFinishEdit();
          }
        }}
      />
    );
  }
  return <span className="relative z-10 whitespace-pre-line px-3 text-center text-xs font-semibold leading-5 text-slate-800">{node.label}</span>;
}

function FlowNode({
  node: item,
  isSelected,
  isConnectorStart,
  isEditing,
  activeTool,
  onNodePointerDown,
  onNodeDoubleClick,
  onResizeStart,
  onLabelChange,
  onFinishEdit,
}) {
  const tone = getTone(item.color);
  const nodeClass = ["absolute select-none", item.type === "lane" ? "z-[1]" : "z-10", isSelected ? "drop-shadow-md" : "drop-shadow-sm"].join(" ");
  const wrapperStyle = { left: item.x, top: item.y, width: item.width, height: item.height };
  const selectedOutline = isSelected ? "ring-2 ring-blue-500 ring-offset-2" : "";
  const connectorOutline = isConnectorStart ? "ring-2 ring-violet-500 ring-offset-2" : "";
  const labelProps = { node: item, editing: isEditing, onChange: onLabelChange, onFinishEdit };
  const baseProps = {
    "data-flow-node": item.id,
    role: "button",
    tabIndex: 0,
    onPointerDown: (event) => onNodePointerDown(event, item),
    onDoubleClick: (event) => {
      event.stopPropagation();
      onNodeDoubleClick(item.id);
    },
    className: "relative flex h-full w-full items-center justify-center transition-shadow",
    style: { cursor: activeTool === "connect" ? "crosshair" : "grab" },
  };

  let surface;
  if (item.type === "lane") {
    surface = (
      <div {...baseProps} className={"relative flex h-full w-full items-start rounded-xl border border-dashed px-5 py-4 " + selectedOutline + " " + connectorOutline} style={{ cursor: activeTool === "connect" ? "crosshair" : "grab", borderColor: "#cbd5e1", backgroundColor: "#f8fafc" }}>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          <Grid className="h-3.5 w-3.5" />
          <NodeLabel {...labelProps} />
        </div>
      </div>
    );
  } else if (item.type === "decision" || item.type === "data") {
    const points = item.type === "decision" ? "50,2 98,50 50,98 2,50" : "12,2 98,2 88,98 2,98";
    surface = (
      <div {...baseProps} className={"relative flex h-full w-full items-center justify-center " + selectedOutline + " " + connectorOutline}>
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon points={points} fill={tone.surface} stroke={tone.accent} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
        <NodeLabel {...labelProps} />
      </div>
    );
  } else if (item.type === "store") {
    surface = (
      <div {...baseProps} className={"relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.35rem] border-2 " + selectedOutline + " " + connectorOutline} style={{ cursor: activeTool === "connect" ? "crosshair" : "grab", borderColor: tone.accent, backgroundColor: tone.surface }}>
        <div className="absolute inset-x-[-2px] top-[-1px] h-7 rounded-[50%] border-2" style={{ borderColor: tone.accent, backgroundColor: tone.surface }} />
        <NodeLabel {...labelProps} />
      </div>
    );
  } else if (item.type === "document") {
    surface = (
      <div {...baseProps} className={"relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg border-2 " + selectedOutline + " " + connectorOutline} style={{ cursor: activeTool === "connect" ? "crosshair" : "grab", borderColor: tone.accent, backgroundColor: tone.surface }}>
        <span className="absolute right-0 top-0 h-7 w-7 border-b-2 border-l-2 bg-white/70" style={{ borderColor: tone.accent }} />
        <NodeLabel {...labelProps} />
      </div>
    );
  } else if (item.type === "note") {
    surface = (
      <div {...baseProps} className={"relative flex h-full w-full items-center justify-center rounded-md border-2 " + selectedOutline + " " + connectorOutline} style={{ cursor: activeTool === "connect" ? "crosshair" : "grab", borderColor: tone.accent, backgroundColor: tone.surface }}>
        <span className="absolute left-0 top-0 h-4 w-full border-b border-dashed opacity-50" style={{ borderColor: tone.accent }} />
        <NodeLabel {...labelProps} />
      </div>
    );
  } else {
    const rounded = item.type === "terminator" ? "rounded-full" : item.type === "external" ? "rounded-md border-double border-[4px]" : "rounded-xl";
    surface = (
      <div {...baseProps} className={"relative flex h-full w-full items-center justify-center border-2 " + rounded + " " + selectedOutline + " " + connectorOutline} style={{ cursor: activeTool === "connect" ? "crosshair" : "grab", borderColor: tone.accent, backgroundColor: tone.surface }}>
        <NodeLabel {...labelProps} />
      </div>
    );
  }

  return (
    <div className={nodeClass} style={wrapperStyle}>
      {surface}
      {isSelected && activeTool === "select" && item.type !== "lane" && (
        <button type="button" aria-label="Resize node" title="Drag to resize" onPointerDown={(event) => onResizeStart(event, item)} className="absolute -bottom-2 -right-2 z-20 h-4 w-4 cursor-nwse-resize rounded-sm border-2 border-white bg-blue-600 shadow-sm" />
      )}
      {activeTool === "connect" && item.type !== "lane" && (
        <span className={"pointer-events-none absolute -right-2 top-1/2 z-20 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white shadow-sm " + (isConnectorStart ? "bg-violet-600" : "bg-blue-500")} />
      )}
    </div>
  );
}

function ToolButton({ active, title, children, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={"flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors " + (active ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100") + " " + className}
    >
      {children}
    </button>
  );
}

export default function FlowWorkspace({ dark, userId }) {
  const [initialDocument] = useState(() => readFlowDocument(userId));
  const [history, setHistory] = useState(() => ({ past: [], present: initialDocument.scene, future: [] }));
  const [title, setTitle] = useState(initialDocument.title);
  const [activeTool, setActiveTool] = useState("select");
  const [selected, setSelected] = useState(null);
  const [connectorStartId, setConnectorStartId] = useState(null);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [pendingTemplateId, setPendingTemplateId] = useState(null);
  const [showMobileTemplates, setShowMobileTemplates] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [zoom, setZoom] = useState(0.65);
  const [saveState, setSaveState] = useState(initialDocument.scene.nodes.length ? "Saved flow loaded" : "Ready to map a flow");
  const canvasRef = useRef(null);
  const viewportRef = useRef(null);
  const latestSave = useRef(null);
  const dragRef = useRef(null);
  const saveTimer = useRef(null);
  const scene = history.present;
  const selectedNode = selected?.kind === "node" ? scene.nodes.find((item) => item.id === selected.id) : null;
  const selectedEdge = selected?.kind === "edge" ? scene.edges.find((item) => item.id === selected.id) : null;

  const commitScene = useCallback((nextOrUpdater) => {
    setHistory((current) => {
      const next = typeof nextOrUpdater === "function" ? nextOrUpdater(current.present) : nextOrUpdater;
      if (scenesMatch(current.present, next)) return current;
      return {
        past: [...current.past, cloneScene(current.present)].slice(-MAX_HISTORY),
        present: next,
        future: [],
      };
    });
  }, []);

  const previewScene = useCallback((updater) => {
    setHistory((current) => ({ ...current, present: typeof updater === "function" ? updater(current.present) : updater }));
  }, []);

  const commitFromSnapshot = useCallback((before) => {
    setHistory((current) => {
      if (!before || scenesMatch(before, current.present)) return current;
      return { past: [...current.past, before].slice(-MAX_HISTORY), present: current.present, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      if (!current.past.length) return current;
      const previous = current.past[current.past.length - 1];
      return { past: current.past.slice(0, -1), present: previous, future: [cloneScene(current.present), ...current.future].slice(0, MAX_HISTORY) };
    });
    setSelected(null);
    setConnectorStartId(null);
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      if (!current.future.length) return current;
      const next = current.future[0];
      return { past: [...current.past, cloneScene(current.present)].slice(-MAX_HISTORY), present: next, future: current.future.slice(1) };
    });
    setSelected(null);
    setConnectorStartId(null);
  }, []);

  const writeScene = useCallback(() => {
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify({ version: 1, title: title.trim() || "Untitled flow", scene, updatedAt: Date.now() }));
      setSaveState("Saved just now");
    } catch {
      setSaveState("Unable to save locally");
    }
  }, [scene, title, userId]);
  latestSave.current = writeScene;
  useEffect(() => () => latestSave.current?.(), []);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("Saving…");
    saveTimer.current = setTimeout(writeScene, 550);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [scene, title, writeScene]);

  const handleExport = useCallback(async (format) => {
    setExportOpen(false);
    setSaveState(`Preparing ${format.toUpperCase()}…`);
    try {
      await exportScene(scene, title, format);
      setSaveState(`Downloaded ${format.toUpperCase()}`);
    } catch {
      setSaveState("Export failed");
    }
  }, [scene, title]);

  const getCanvasPoint = useCallback((event) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.max(0, Math.min(CANVAS_WIDTH, (event.clientX - rect.left) * CANVAS_WIDTH / rect.width)),
      y: Math.max(0, Math.min(CANVAS_HEIGHT, (event.clientY - rect.top) * CANVAS_HEIGHT / rect.height)),
    };
  }, []);

  const makeNode = useCallback((type, point) => {
    const defaults = NODE_DEFAULTS[type] || NODE_DEFAULTS.process;
    const id = "node-" + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36));
    return node(
      id,
      type,
      defaults.label,
      Math.max(24, Math.min(CANVAS_WIDTH - defaults.width - 24, point.x - defaults.width / 2)),
      Math.max(24, Math.min(CANVAS_HEIGHT - defaults.height - 24, point.y - defaults.height / 2)),
      defaults.width,
      defaults.height,
      defaults.color,
    );
  }, []);

  const insertNode = useCallback((type, point) => {
    const created = makeNode(type, point);
    commitScene((current) => ({ ...current, nodes: [...current.nodes, created] }));
    setSelected({ kind: "node", id: created.id });
    setEditingNodeId(created.id);
  }, [commitScene, makeNode]);

  const updateNode = useCallback((id, updates) => {
    commitScene((current) => ({ ...current, nodes: current.nodes.map((item) => item.id === id ? { ...item, ...updates } : item) }));
  }, [commitScene]);

  const updateEdge = useCallback((id, updates) => {
    commitScene((current) => ({ ...current, edges: current.edges.map((item) => item.id === id ? { ...item, ...updates } : item) }));
  }, [commitScene]);

  const deleteSelected = useCallback(() => {
    if (selected?.kind === "node") {
      const id = selected.id;
      commitScene((current) => ({ ...current, nodes: current.nodes.filter((item) => item.id !== id), edges: current.edges.filter((item) => item.source !== id && item.target !== id) }));
    }
    if (selected?.kind === "edge") {
      commitScene((current) => ({ ...current, edges: current.edges.filter((item) => item.id !== selected.id) }));
    }
    setSelected(null);
    setConnectorStartId(null);
  }, [commitScene, selected]);

  const finishConnection = useCallback((targetId) => {
    if (!connectorStartId) {
      setConnectorStartId(targetId);
      setSelected({ kind: "node", id: targetId });
      return;
    }
    if (connectorStartId === targetId) {
      setConnectorStartId(null);
      return;
    }
    const isDuplicate = scene.edges.some((item) => item.source === connectorStartId && item.target === targetId);
    if (!isDuplicate) {
      const id = "edge-" + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36));
      const defaultLabel = scene.diagramType === "dataflow" ? "data" : "flow";
      commitScene((current) => ({ ...current, edges: [...current.edges, edge(id, connectorStartId, targetId, defaultLabel)] }));
      setSelected({ kind: "edge", id });
    }
    setConnectorStartId(null);
  }, [commitScene, connectorStartId, scene.diagramType, scene.edges]);

  const handleNodePointerDown = useCallback((event, item) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    if (activeTool === "connect") {
      finishConnection(item.id);
      return;
    }
    if (activeTool !== "select") return;
    const point = getCanvasPoint(event);
    if (!point) return;
    setSelected({ kind: "node", id: item.id });
    setConnectorStartId(null);
    dragRef.current = {
      mode: "move",
      id: item.id,
      start: point,
      startNode: { x: item.x, y: item.y, width: item.width, height: item.height },
      before: cloneScene(scene),
      pointerId: event.pointerId,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is not available in every embedded browser.
    }
  }, [activeTool, finishConnection, getCanvasPoint, scene]);

  const handleResizeStart = useCallback((event, item) => {
    if (activeTool !== "select") return;
    event.preventDefault();
    event.stopPropagation();
    const point = getCanvasPoint(event);
    if (!point) return;
    setSelected({ kind: "node", id: item.id });
    dragRef.current = {
      mode: "resize",
      id: item.id,
      start: point,
      startNode: { x: item.x, y: item.y, width: item.width, height: item.height },
      before: cloneScene(scene),
      pointerId: event.pointerId,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is not available in every embedded browser.
    }
  }, [activeTool, getCanvasPoint, scene]);

  const handleCanvasPointerMove = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = getCanvasPoint(event);
    if (!point) return;
    const dx = point.x - drag.start.x;
    const dy = point.y - drag.start.y;
    previewScene((current) => ({
      ...current,
      nodes: current.nodes.map((item) => {
        if (item.id !== drag.id) return item;
        if (drag.mode === "resize") {
          const minWidth = item.type === "lane" ? 360 : 84;
          const minHeight = item.type === "lane" ? 90 : 52;
          return {
            ...item,
            width: Math.max(minWidth, Math.min(CANVAS_WIDTH - item.x - 18, drag.startNode.width + dx)),
            height: Math.max(minHeight, Math.min(CANVAS_HEIGHT - item.y - 18, drag.startNode.height + dy)),
          };
        }
        return {
          ...item,
          x: Math.max(18, Math.min(CANVAS_WIDTH - item.width - 18, drag.startNode.x + dx)),
          y: Math.max(18, Math.min(CANVAS_HEIGHT - item.height - 18, drag.startNode.y + dy)),
        };
      }),
    }));
  }, [getCanvasPoint, previewScene]);

  const finishPointerAction = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    commitFromSnapshot(drag.before);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may have been released by the browser already.
    }
  }, [commitFromSnapshot]);

  const handleCanvasPointerDown = useCallback((event) => {
    if (event.button !== 0 || event.target.closest?.("[data-flow-node]")) return;
    const point = getCanvasPoint(event);
    if (!point) return;
    if (activeTool === "connect") {
      setConnectorStartId(null);
      return;
    }
    if (activeTool !== "select") {
      insertNode(activeTool, point);
      return;
    }
    setSelected(null);
    setEditingNodeId(null);
  }, [activeTool, getCanvasPoint, insertNode]);

  const applyTemplate = useCallback((templateId) => {
    const template = TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    commitScene(template.create());
    setTitle(template.title);
    setSelected(null);
    setConnectorStartId(null);
    setEditingNodeId(null);
    setActiveTool("select");
    setPendingTemplateId(null);
    setShowMobileTemplates(false);
  }, [commitScene]);

  const requestTemplate = useCallback((templateId) => {
    if (scene.nodes.length || scene.edges.length) {
      setPendingTemplateId(templateId);
      return;
    }
    applyTemplate(templateId);
  }, [applyTemplate, scene.edges.length, scene.nodes.length]);

  useEffect(() => {
    const handler = (event) => {
      const editingField = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      if (editingField) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selected) {
        event.preventDefault();
        deleteSelected();
      }
      if (event.key === "Escape") {
        setConnectorStartId(null);
        setSelected(null);
        setEditingNodeId(null);
        setExportOpen(false);
        setActiveTool("select");
      }
      if (event.key.toLowerCase() === "v") setActiveTool("select");
      if (event.key.toLowerCase() === "c") setActiveTool("connect");
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [deleteSelected, redo, selected, undo]);

  const shellClass = dark ? "border-slate-800 bg-[#0c1327]" : "border-slate-200 bg-white";
  const dividerClass = dark ? "border-slate-800" : "border-slate-200";
  const titleClass = dark ? "text-white" : "text-slate-900";
  const mutedClass = dark ? "text-slate-400" : "text-slate-500";
  const sidePanelClass = dark ? "bg-[#0d1730]" : "bg-slate-50/80";
  const hasContent = scene.nodes.length || scene.edges.length;

  return (
    <main className="mx-auto h-[calc(100vh-88px)] w-full max-w-[1800px] p-3 sm:p-4">
      <section className={"flex h-full min-h-[620px] flex-col overflow-hidden rounded-2xl border shadow-sm " + shellClass}>
        <header className={"flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5 " + dividerClass}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
              <GitBranch className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <input aria-label="Flow document title" value={title} onChange={(event) => setTitle(event.target.value)} className={"min-w-0 max-w-[280px] border-none bg-transparent p-0 text-sm font-bold outline-none focus:ring-0 " + titleClass} />
                <span className="hidden rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-700 sm:inline-flex">Diagram builder</span>
              </div>
              <p className={"mt-0.5 text-xs " + mutedClass}>Connect processes, people, systems, and the data between them.</p>
            </div>
          </div>
          <div className={"flex items-center gap-2 text-xs font-semibold " + mutedClass}>
            {saveState === "Saving…" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-emerald-500" />}
            <span className="hidden sm:inline">{saveState}</span>
            <button type="button" onClick={writeScene} className={"ml-1 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-colors " + (dark ? "border-slate-700 text-slate-200 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")}>
              <Save className="h-3.5 w-3.5" /> Save
            </button>
            <div className="relative">
              <button type="button" aria-label="Export diagram" aria-expanded={exportOpen} onClick={() => setExportOpen((value) => !value)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-white shadow-sm transition-colors hover:bg-blue-700">
                <Download className="h-3.5 w-3.5" /> Export <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {exportOpen && (
                <div className={"absolute right-0 top-full z-50 mt-2 w-40 rounded-xl border p-1.5 text-left shadow-xl " + (dark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white")}>
                  <button type="button" onClick={() => handleExport("pdf")} className={"flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold " + (dark ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-50")}><FileText className="h-4 w-4 text-rose-500" /> PDF</button>
                  <button type="button" onClick={() => handleExport("jpg")} className={"flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold " + (dark ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-50")}><Download className="h-4 w-4 text-blue-500" /> JPG image</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex flex-1">
          <aside className={"hidden w-[250px] flex-none flex-col overflow-y-auto border-r p-4 lg:flex " + dividerClass + " " + sidePanelClass}>
            <div className="mb-5">
              <p className={"text-[11px] font-bold uppercase tracking-[0.16em] " + mutedClass}>Start from a template</p>
              <div className="mt-2 space-y-1">
                {TEMPLATES.map((template) => {
                  const Icon = template.icon;
                  const active = scene.diagramType === template.id;
                  return (
                    <button key={template.id} type="button" onClick={() => requestTemplate(template.id)} className={"flex w-full items-start gap-2 rounded-lg p-2 text-left transition-colors " + (active ? (dark ? "bg-violet-500/15 text-violet-200" : "bg-violet-50 text-violet-800") : (dark ? "text-slate-300 hover:bg-slate-800" : "text-slate-700 hover:bg-white"))}>
                      <Icon className="mt-0.5 h-4 w-4 flex-none" />
                      <span>
                        <span className="block text-xs font-bold">{template.label}</span>
                        <span className={"mt-0.5 block text-[11px] leading-4 " + mutedClass}>{template.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col">
            <div className={"flex flex-wrap items-center gap-1 border-b px-3 py-2 " + dividerClass}>
              <ToolButton active={activeTool === "select"} title="Select and move blocks (V)" onClick={() => { setActiveTool("select"); setConnectorStartId(null); }}>
                <MousePointer2 className="h-4 w-4" /><span className="hidden sm:inline">Select</span>
              </ToolButton>
              <ToolButton active={activeTool === "connect"} title="Connect two blocks (C)" onClick={() => { setActiveTool("connect"); setSelected(null); }}>
                <ArrowRight className="h-4 w-4" /><span className="hidden sm:inline">Connect</span>
              </ToolButton>
              <span className={"mx-1 hidden h-6 w-px sm:block " + (dark ? "bg-slate-700" : "bg-slate-200")} />
              {NODE_LIBRARY.filter((item) => ["terminator", "process", "decision", "data", "store"].includes(item.type)).map((item) => (
                <ToolButton key={item.type} active={activeTool === item.type} title={"Place " + item.label} onClick={() => { setActiveTool(item.type); setConnectorStartId(null); setSelected(null); }}>
                  <NodeTypeIcon type={item.type} className="h-4 w-4" />
                  <span className="hidden xl:inline">{item.type === "terminator" ? "Start/end" : item.type === "data" ? "Data" : item.label}</span>
                </ToolButton>
              ))}
              <select
                aria-label="More diagram blocks"
                value={NODE_LIBRARY.some((item) => item.type === activeTool) && !["terminator", "process", "decision", "data", "store"].includes(activeTool) ? activeTool : ""}
                onChange={(event) => {
                  if (!event.target.value) return;
                  setActiveTool(event.target.value);
                  setConnectorStartId(null);
                  setSelected(null);
                }}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600"
              >
                <option value="">More blocks…</option>
                {NODE_LIBRARY.filter((item) => !["terminator", "process", "decision", "data", "store"].includes(item.type)).map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}
              </select>
              <div className="relative ml-1 lg:hidden">
                <ToolButton active={showMobileTemplates} title="Choose a template" onClick={() => setShowMobileTemplates((value) => !value)}>
                  <Workflow className="h-4 w-4" /><ChevronDown className="h-3 w-3" />
                </ToolButton>
                {showMobileTemplates && (
                  <div className={"absolute left-0 top-full z-40 mt-2 w-64 rounded-xl border p-2 shadow-xl " + (dark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white")}>
                    {TEMPLATES.map((template) => (
                      <button key={template.id} type="button" onClick={() => requestTemplate(template.id)} className={"flex w-full items-center gap-2 rounded-lg p-2 text-left text-xs font-semibold " + (dark ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-50")}>
                        <template.icon className="h-4 w-4 text-violet-500" />
                        {template.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="ml-auto flex items-center gap-1">
                <select aria-label="Canvas zoom" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="rounded border border-slate-200 bg-white p-1 text-xs text-slate-700">
                  {[0.35, 0.5, 0.65, 0.8, 1, 1.25, 1.5].map(value => <option key={value} value={value}>{Math.round(value * 100)}%</option>)}
                </select>
                <ToolButton active={false} title="Undo (Ctrl/Cmd + Z)" onClick={undo} className="px-2"><Undo className="h-4 w-4" /></ToolButton>
                <ToolButton active={false} title="Redo (Ctrl/Cmd + Y)" onClick={redo} className="px-2"><Redo className="h-4 w-4" /></ToolButton>
                <ToolButton active={false} title="Clear diagram" onClick={() => requestTemplate("blank")} className="px-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></ToolButton>
              </div>
            </div>

            <div className={"flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-xs " + dividerClass + " " + (dark ? "bg-slate-900/35 text-slate-400" : "bg-slate-50/70 text-slate-500")}>
              <span>
                {activeTool === "connect"
                  ? connectorStartId ? "Now select the destination block to finish the connector." : "Connect is active — select a source block, then a destination block."
                  : activeTool === "select" ? "Select, drag, resize, or double-click a block to rename it."
                    : "Click anywhere on the canvas to place a " + (NODE_LIBRARY.find((item) => item.type === activeTool)?.label || "block") + ". The tool stays active until you change it."}
              </span>
              <span className="hidden font-medium xl:inline">V Select · C Connect · Delete remove · Ctrl/Cmd + Z undo</span>
            </div>

            {(selectedNode || selectedEdge) && (
              <div className={"flex flex-wrap items-center gap-2 border-b px-3 py-2 " + dividerClass + " " + (dark ? "bg-slate-900/70" : "bg-white")}>
                {selectedNode ? (
                  <>
                    <div className={"flex items-center gap-1.5 text-xs font-bold " + titleClass}>
                      <NodeTypeIcon type={selectedNode.type} className="h-4 w-4 text-blue-500" />
                      {NODE_LIBRARY.find((item) => item.type === selectedNode.type)?.label || "Block"}
                    </div>
                    <input
                      aria-label="Selected block label"
                      value={selectedNode.label}
                      onChange={(event) => updateNode(selectedNode.id, { label: event.target.value })}
                      className="min-w-[180px] flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <div className="flex items-center gap-1.5">
                      {NODE_COLORS.map((color) => (
                        <button key={color.id} type="button" title={color.label} aria-label={"Use " + color.label + " block color"} onClick={() => updateNode(selectedNode.id, { color: color.id })} className={"h-5 w-5 rounded-full border-2 border-white transition-transform hover:scale-110 " + (selectedNode.color === color.id ? "ring-2 ring-blue-500 ring-offset-1" : "")} style={{ backgroundColor: color.accent }} />
                      ))}
                    </div>
                    <button type="button" onClick={deleteSelected} title="Delete block" aria-label="Delete selected block" className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                  </>
                ) : (
                  <>
                    <div className={"flex items-center gap-1.5 text-xs font-bold " + titleClass}><ArrowRight className="h-4 w-4 text-blue-500" /> Connector</div>
                    <input
                      aria-label="Selected connector label"
                      value={selectedEdge.label}
                      onChange={(event) => updateEdge(selectedEdge.id, { label: event.target.value })}
                      placeholder="Label this connection"
                      className="min-w-[180px] flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <div className="flex items-center gap-1">
                      {["solid", "dashed"].map((style) => <button key={style} type="button" onClick={() => updateEdge(selectedEdge.id, { style })} className={"rounded-lg border px-2 py-1 text-[11px] font-bold capitalize " + (selectedEdge.style === style ? "border-blue-500 bg-blue-50 text-blue-700" : (dark ? "border-slate-700 text-slate-300" : "border-slate-200 bg-white text-slate-600"))}>{style}</button>)}
                    </div>
                    <button type="button" onClick={deleteSelected} title="Delete connector" aria-label="Delete selected connector" className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                  </>
                )}
                <button type="button" onClick={() => setSelected(null)} title="Close properties" aria-label="Close properties" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
              </div>
            )}

            <div ref={viewportRef} className={"min-h-0 flex-1 overflow-auto p-3 sm:p-4 " + (dark ? "bg-[#080d1e]" : "bg-slate-100")}>
              <div style={{ width: CANVAS_WIDTH * zoom, height: CANVAS_HEIGHT * zoom }}>
              <div
                ref={canvasRef}
                className="relative overflow-hidden rounded-xl border bg-white shadow-[0_16px_45px_rgba(15,23,42,0.12)]"
                style={{
                  minWidth: CANVAS_WIDTH,
                  minHeight: CANVAS_HEIGHT,
                  width: CANVAS_WIDTH,
                  height: CANVAS_HEIGHT,
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                  touchAction: "none",
                  borderColor: dark ? "#334155" : "#cbd5e1",
                  backgroundImage: "radial-gradient(#cbd5e1 0.9px, transparent 0.9px)",
                  backgroundSize: "20px 20px",
                }}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={finishPointerAction}
                onPointerCancel={finishPointerAction}
              >
                <FlowEdges
                  nodes={scene.nodes}
                  edges={scene.edges}
                  selectedEdgeId={selected?.kind === "edge" ? selected.id : null}
                  onSelectEdge={(id) => {
                    if (activeTool === "select") {
                      setSelected({ kind: "edge", id });
                      setConnectorStartId(null);
                    }
                  }}
                />
                {[...scene.nodes].sort((a, b) => (a.type === "lane" ? -1 : 1) - (b.type === "lane" ? -1 : 1)).map((item) => (
                  <FlowNode
                    key={item.id}
                    node={item}
                    isSelected={selected?.kind === "node" && selected.id === item.id}
                    isConnectorStart={connectorStartId === item.id}
                    isEditing={editingNodeId === item.id}
                    activeTool={activeTool}
                    onNodePointerDown={handleNodePointerDown}
                    onNodeDoubleClick={(id) => {
                      if (activeTool !== "select") return;
                      setSelected({ kind: "node", id });
                      setEditingNodeId(id);
                    }}
                    onResizeStart={handleResizeStart}
                    onLabelChange={(label) => updateNode(item.id, { label })}
                    onFinishEdit={() => setEditingNodeId(null)}
                  />
                ))}

                {!hasContent && (
                  <div className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center">
                    <div className="max-w-sm rounded-2xl border border-dashed border-slate-300 bg-white/95 p-6 text-center shadow-sm">
                      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                        <Workflow className="h-5 w-5" />
                      </span>
                      <h2 className="mt-3 text-base font-bold text-slate-900">Start mapping your flow</h2>
                      <p className="mt-1 text-sm leading-5 text-slate-500">Choose a template on the left or choose a block above, then click the canvas to place it.</p>
                    </div>
                  </div>
                )}
              </div>
              </div>
            </div>
          </section>

        </div>
      </section>

      {pendingTemplateId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="replace-diagram-title">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="replace-diagram-title" className="text-lg font-bold text-slate-900">Replace this diagram?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">The selected template will replace the current blocks and connectors. You can still use Undo immediately afterwards.</p>
              </div>
              <button type="button" onClick={() => setPendingTemplateId(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setPendingTemplateId(null)} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button type="button" onClick={() => applyTemplate(pendingTemplateId)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700">Use template</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
