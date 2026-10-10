import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge, applyEdgeChanges, applyNodeChanges, Background, ConnectionMode, Controls, MarkerType, MiniMap, ReactFlow,
  ReactFlowProvider, reconnectEdge, useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignStartHorizontal, AlignStartVertical,
  ArrowLeftRight, ChevronDown, Code2, Copy, Download, FileImage, FileText, Image as ImageIcon, LayoutGrid, Redo, Trash2, Undo, Wand2, X,
} from "lucide-react";
import { toast } from "sonner";
import { alignBlocks, distributeBlocks } from "../../workspace/geometry";
import { EDGE_TYPES, kindInfo, makeEdge, makeNode, NODE_COLORS, NODE_KINDS, nodesInLane, uid } from "../model";
import { layoutScene } from "../layout";
import { FlowEditorContext, NODE_TYPES } from "./nodes";
import MermaidDialog from "./MermaidDialog";
import { exportFlowImage, exportFlowMermaid } from "./exportFlow";

const isTyping = (element) => element && (["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName) || element.isContentEditable);

// Only these fields are stored; React Flow's runtime flags are dropped.
const cleanNode = ({ id, type, position, width, height, zIndex, data }) => ({ id, type, position: { x: Math.round(position.x), y: Math.round(position.y) }, width: Math.round(width), height: Math.round(height), ...(zIndex != null ? { zIndex } : {}), data });
const cleanEdge = ({ id, source, target, sourceHandle, targetHandle, type, label, data }) => ({ id, source, target, sourceHandle: sourceHandle ?? null, targetHandle: targetHandle ?? null, type: type ?? "smoothstep", label: label ?? "", data: { style: data?.style ?? "solid" } });

/** Connectors saved without handles attach to the sides that face each other. */
function autoHandles(edge, byId) {
  if (edge.sourceHandle && edge.targetHandle) return {};
  const a = byId.get(edge.source);
  const b = byId.get(edge.target);
  if (!a || !b) return {};
  const dx = (b.position.x + (b.width ?? 0) / 2) - (a.position.x + (a.width ?? 0) / 2);
  const dy = (b.position.y + (b.height ?? 0) / 2) - (a.position.y + (a.height ?? 0) / 2);
  const horizontal = Math.abs(dx) > Math.abs(dy);
  const [from, to] = horizontal ? (dx >= 0 ? ["r", "l"] : ["l", "r"]) : (dy >= 0 ? ["b", "t"] : ["t", "b"]);
  return { sourceHandle: edge.sourceHandle ?? from, targetHandle: edge.targetHandle ?? to };
}

function keepSelection(next, previous) {
  const selected = new Set(previous.filter((item) => item.selected).map((item) => item.id));
  return next.map((item) => (selected.has(item.id) ? { ...item, selected: true } : item));
}

function Btn({ title, onClick, disabled, active, children, className = "" }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"} ${className}`}>
      {children}
    </button>
  );
}

function Inspector({ nodes, edges, onNodeData, onNodeKind, onEdge, onDelete, onAlign, onDistribute, onReverse }) {
  const selectedNodes = nodes.filter((node) => node.selected);
  const selectedEdges = edges.filter((edge) => edge.selected);
  if (!selectedNodes.length && !selectedEdges.length) return null;
  const field = "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  if (selectedNodes.length > 1 || (selectedNodes.length && selectedEdges.length)) {
    return (
      <aside className="w-60 flex-none space-y-3 overflow-y-auto border-l border-slate-200 bg-white p-4">
        <p className="text-xs font-bold text-slate-700">{selectedNodes.length} blocks{selectedEdges.length ? `, ${selectedEdges.length} connectors` : ""}</p>
        {selectedNodes.length > 1 && (
          <>
            <div className="grid grid-cols-6 gap-1">
              {[["left", AlignStartVertical], ["center", AlignCenterVertical], ["right", AlignEndVertical], ["top", AlignStartHorizontal], ["middle", AlignCenterHorizontal], ["bottom", AlignEndHorizontal]].map(([mode, Icon]) => (
                <button key={mode} type="button" title={`Align ${mode}`} aria-label={`Align ${mode}`} onClick={() => onAlign(mode)} className="flex h-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"><Icon className="h-4 w-4" /></button>
              ))}
            </div>
            {selectedNodes.length > 2 && (
              <div className="grid grid-cols-2 gap-1">
                <button type="button" onClick={() => onDistribute("x")} className="rounded-md bg-slate-100 px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-200">Space across</button>
                <button type="button" onClick={() => onDistribute("y")} className="rounded-md bg-slate-100 px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-200">Space down</button>
              </div>
            )}
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Colour</p>
              <div className="flex flex-wrap gap-1.5">{NODE_COLORS.map((color) => <button key={color.id} type="button" title={color.label} aria-label={color.label} onClick={() => selectedNodes.forEach((node, i) => onNodeData(node.id, { color: color.id }, i === selectedNodes.length - 1))} className="h-6 w-6 rounded-full border-2 border-white shadow" style={{ backgroundColor: color.accent }} />)}</div>
            </div>
          </>
        )}
        <button type="button" onClick={onDelete} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
      </aside>
    );
  }

  if (selectedNodes.length === 1) {
    const node = selectedNodes[0];
    return (
      <aside className="w-60 flex-none space-y-4 overflow-y-auto border-l border-slate-200 bg-white p-4">
        <p className="text-xs font-bold text-slate-700">{kindInfo(node.data.kind).label}</p>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Label</span>
          <textarea key={node.id} defaultValue={node.data.label} rows={3} onBlur={(event) => { if (event.target.value !== node.data.label) onNodeData(node.id, { label: event.target.value }); }} className={`${field} resize-y`} />
        </label>
        {node.type !== "lane" && (
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Shape</span>
            <select value={node.data.kind} onChange={(event) => onNodeKind(node.id, event.target.value)} className={field}>
              {NODE_KINDS.filter((item) => item.kind !== "lane").map((item) => <option key={item.kind} value={item.kind}>{item.label}</option>)}
            </select>
          </label>
        )}
        {node.type !== "lane" && (
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Colour</p>
            <div className="flex flex-wrap gap-1.5">{NODE_COLORS.map((color) => <button key={color.id} type="button" title={color.label} aria-label={color.label} onClick={() => onNodeData(node.id, { color: color.id })} className={`h-6 w-6 rounded-full border-2 border-white shadow ${node.data.color === color.id ? "ring-2 ring-blue-500 ring-offset-1" : ""}`} style={{ backgroundColor: color.accent }} />)}</div>
          </div>
        )}
        <button type="button" onClick={onDelete} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
      </aside>
    );
  }

  const edge = selectedEdges[0];
  return (
    <aside className="w-60 flex-none space-y-4 overflow-y-auto border-l border-slate-200 bg-white p-4">
      <p className="text-xs font-bold text-slate-700">Connector</p>
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Label</span>
        <input key={edge.id} defaultValue={edge.label} onBlur={(event) => { if (event.target.value !== edge.label) onEdge(edge.id, { label: event.target.value }); }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} placeholder="e.g. Yes, request, 1 : N" className={field} />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Route</span>
        <select value={edge.type ?? "smoothstep"} onChange={(event) => onEdge(edge.id, { type: event.target.value })} className={field}>
          {EDGE_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-1">
        {["solid", "dashed"].map((style) => <button key={style} type="button" onClick={() => onEdge(edge.id, { data: { style } })} className={`rounded-md py-1.5 text-[11px] font-bold capitalize ${edge.data?.style === style || (!edge.data?.style && style === "solid") ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{style}</button>)}
      </div>
      <button type="button" onClick={() => onReverse(edge.id)} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-100 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"><ArrowLeftRight className="h-3.5 w-3.5" /> Reverse direction</button>
      <button type="button" onClick={onDelete} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
    </aside>
  );
}

function Editor({ scene, commit, undo, redo, canUndo, canRedo, title, viewport, onViewportChange }) {
  const flow = useReactFlow();
  const [nodes, setNodesState] = useState(scene.nodes);
  const [edges, setEdgesState] = useState(scene.edges);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const sceneRef = useRef(scene);
  const lastCommitted = useRef(scene);
  const laneDrag = useRef(null);
  const clipboard = useRef(null);
  const wrapperRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [menu, setMenu] = useState(null); // "tidy" | "export"
  const [quickAdd, setQuickAdd] = useState(null);
  const [mermaidOpen, setMermaidOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  sceneRef.current = scene;

  const setNodes = (next) => { nodesRef.current = next; setNodesState(next); };
  const setEdges = (next) => { edgesRef.current = next; setEdgesState(next); };

  // Undo/redo (or a reload) replaced the scene → show it, keeping selection.
  useEffect(() => {
    if (scene === lastCommitted.current) return;
    lastCommitted.current = scene;
    setNodes(keepSelection(scene.nodes, nodesRef.current));
    setEdges(keepSelection(scene.edges, edgesRef.current));
  }, [scene]); // eslint-disable-line react-hooks/exhaustive-deps

  const commitLive = useCallback((extra = {}) => {
    const next = { ...sceneRef.current, ...extra, nodes: nodesRef.current.map(cleanNode), edges: edgesRef.current.map(cleanEdge) };
    lastCommitted.current = next;
    commit(next);
  }, [commit]);

  // ─── React Flow change handlers ─────────────────────────────────────────

  const onNodesChange = useCallback((changes) => {
    setNodes(applyNodeChanges(changes, nodesRef.current));
    const finished = changes.some((change) => (change.type === "position" && change.dragging === false) || (change.type === "dimensions" && change.resizing === false) || change.type === "remove");
    if (finished) commitLive();
  }, [commitLive]);

  const onEdgesChange = useCallback((changes) => {
    setEdges(applyEdgeChanges(changes, edgesRef.current));
    if (changes.some((change) => change.type === "remove")) commitLive();
  }, [commitLive]);

  const onConnect = useCallback((connection) => {
    const defaultLabel = sceneRef.current.diagramType === "dataflow" ? "data" : "";
    setEdges(addEdge(makeEdge(connection.source, connection.target, { sourceHandle: connection.sourceHandle, targetHandle: connection.targetHandle, label: defaultLabel }), edgesRef.current));
    commitLive();
  }, [commitLive]);

  const onReconnect = useCallback((oldEdge, connection) => {
    setEdges(reconnectEdge(oldEdge, connection, edgesRef.current));
    commitLive();
  }, [commitLive]);

  // Dropping a new connection on empty canvas offers the next block.
  // Dropping on a block's body (not just its dot) still connects to it.
  const onConnectEnd = useCallback((event, state) => {
    if (state.isValid || !state.fromNode) return;
    const point = "changedTouches" in event ? event.changedTouches[0] : event;
    const targetId = document.elementsFromPoint(point.clientX, point.clientY)
      .map((element) => element.closest?.(".react-flow__node"))
      .find(Boolean)?.dataset.id;
    if (targetId && targetId !== state.fromNode.id) {
      const defaultLabel = sceneRef.current.diagramType === "dataflow" ? "data" : "";
      setEdges([...edgesRef.current, makeEdge(state.fromNode.id, targetId, { sourceHandle: state.fromHandle?.id ?? null, label: defaultLabel })]);
      commitLive();
      return;
    }
    setQuickAdd({ x: point.clientX, y: point.clientY, fromId: state.fromNode.id, fromHandle: state.fromHandle?.id ?? null });
  }, [commitLive]);

  // Lanes carry the blocks inside them.
  const onNodeDragStart = useCallback((_, node) => {
    if (node.type !== "lane") { laneDrag.current = null; return; }
    laneDrag.current = { id: node.id, start: { ...node.position }, members: nodesInLane(node, nodesRef.current).filter((member) => !member.selected).map((member) => ({ id: member.id, position: { ...member.position } })) };
  }, []);
  const onNodeDrag = useCallback((_, node) => {
    const drag = laneDrag.current;
    if (!drag || drag.id !== node.id) return;
    const dx = node.position.x - drag.start.x;
    const dy = node.position.y - drag.start.y;
    const moved = new Map(drag.members.map((member) => [member.id, { x: member.position.x + dx, y: member.position.y + dy }]));
    setNodes(nodesRef.current.map((item) => (moved.has(item.id) ? { ...item, position: moved.get(item.id) } : item)));
  }, []);

  // ─── Editing helpers ────────────────────────────────────────────────────

  const updateNodeData = useCallback((id, patch, shouldCommit = true) => {
    setNodes(nodesRef.current.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...patch } } : node)));
    if (shouldCommit) commitLive();
  }, [commitLive]);

  const changeKind = (id, kind) => {
    const info = kindInfo(kind);
    setNodes(nodesRef.current.map((node) => (node.id === id ? { ...node, data: { ...node.data, kind }, width: info.width, height: info.height } : node)));
    commitLive();
  };

  const updateEdge = (id, patch) => {
    setEdges(edgesRef.current.map((edge) => (edge.id === id ? { ...edge, ...patch, data: { ...edge.data, ...patch.data } } : edge)));
    commitLive();
  };

  const reverseEdge = (id) => {
    setEdges(edgesRef.current.map((edge) => (edge.id === id ? { ...edge, source: edge.target, target: edge.source, sourceHandle: edge.targetHandle, targetHandle: edge.sourceHandle } : edge)));
    commitLive();
  };

  const deleteSelection = () => {
    const removed = new Set(nodesRef.current.filter((node) => node.selected).map((node) => node.id));
    setNodes(nodesRef.current.filter((node) => !removed.has(node.id)));
    setEdges(edgesRef.current.filter((edge) => !edge.selected && !removed.has(edge.source) && !removed.has(edge.target)));
    commitLive();
  };

  const addNode = (kind, flowPoint, select = true) => {
    const info = kindInfo(kind);
    const node = makeNode(kind, { x: flowPoint.x - info.width / 2, y: flowPoint.y - info.height / 2 });
    const base = select ? nodesRef.current.map((item) => ({ ...item, selected: false })) : nodesRef.current;
    setNodes(kind === "lane" ? [{ ...node, selected: select }, ...base] : [...base, { ...node, selected: select }]);
    return node;
  };

  const addAtCenter = (kind) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    const center = flow.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    const node = addNode(kind, center);
    commitLive();
    if (kind !== "lane") setEditingId(node.id);
  };

  const chooseQuickAdd = (kind) => {
    const point = flow.screenToFlowPosition({ x: quickAdd.x, y: quickAdd.y });
    const node = addNode(kind, point);
    setEdges([...edgesRef.current, makeEdge(quickAdd.fromId, node.id, { sourceHandle: quickAdd.fromHandle })]);
    commitLive();
    setQuickAdd(null);
    setEditingId(node.id);
  };

  const applyPatches = (patches) => {
    setNodes(nodesRef.current.map((node) => (patches[node.id] ? { ...node, position: { x: patches[node.id].x ?? node.position.x, y: patches[node.id].y ?? node.position.y } } : node)));
    commitLive();
  };
  const asBoxes = () => nodesRef.current.filter((node) => node.selected).map((node) => ({ id: node.id, x: node.position.x, y: node.position.y, width: node.width, height: node.height }));

  // ─── Tidy up (animated) ─────────────────────────────────────────────────

  const tidy = (direction) => {
    setMenu(null);
    const current = { ...sceneRef.current, nodes: nodesRef.current.map(cleanNode), edges: edgesRef.current.map(cleanEdge) };
    if (!current.nodes.length) return;
    const target = layoutScene(current, direction);
    const from = new Map(current.nodes.map((node) => [node.id, node]));
    const started = performance.now();
    let finished = false;
    // Background tabs throttle animation frames; never leave a half-done layout.
    const fallback = setTimeout(() => { if (!finished) step(started + 320); }, 700);
    const step = (time) => {
      if (finished) return;
      const t = Math.min(1, (time - started) / 320);
      const ease = 1 - (1 - t) ** 3;
      setNodes(nodesRef.current.map((node) => {
        const a = from.get(node.id);
        const b = target.nodes.find((item) => item.id === node.id);
        if (!a || !b) return node;
        return { ...node, position: { x: a.position.x + (b.position.x - a.position.x) * ease, y: a.position.y + (b.position.y - a.position.y) * ease }, width: a.width + (b.width - a.width) * ease, height: a.height + (b.height - a.height) * ease };
      }));
      if (t < 1) requestAnimationFrame(step);
      else {
        finished = true;
        clearTimeout(fallback);
        commitLive({ direction });
        requestAnimationFrame(() => flow.fitView({ padding: 0.15, duration: 300 }));
      }
    };
    requestAnimationFrame(step);
  };

  // ─── Import / export ────────────────────────────────────────────────────

  const importScene = (parsed, mode) => {
    const laid = layoutScene(parsed.scene, parsed.direction);
    if (mode === "replace") {
      setNodes(laid.nodes);
      setEdges(laid.edges);
      commitLive({ diagramType: laid.diagramType, direction: parsed.direction });
    } else {
      // Place the import to the right of what's there.
      const right = nodesRef.current.reduce((max, node) => Math.max(max, node.position.x + node.width), 0);
      const shifted = laid.nodes.map((node) => ({ ...node, position: { x: node.position.x + right + 120, y: node.position.y } }));
      setNodes([...nodesRef.current, ...shifted]);
      setEdges([...edgesRef.current, ...laid.edges]);
      commitLive();
    }
    setMermaidOpen(false);
    requestAnimationFrame(() => flow.fitView({ padding: 0.15, duration: 300 }));
  };

  const runExport = async (format) => {
    setMenu(null);
    if (!nodesRef.current.length) { toast.info("Add something to the diagram first."); return; }
    setBusy(true);
    try {
      if (format === "mermaid-copy" || format === "mermaid-file") {
        await exportFlowMermaid({ ...sceneRef.current, nodes: nodesRef.current, edges: edgesRef.current }, title, format === "mermaid-copy");
        if (format === "mermaid-copy") toast.success("Mermaid copied — paste it into GitHub, Notion or any Mermaid editor");
      } else {
        setNodes(nodesRef.current.map((node) => ({ ...node, selected: false })));
        setEdges(edgesRef.current.map((edge) => ({ ...edge, selected: false })));
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await exportFlowImage(wrapperRef.current, nodesRef.current, title, format);
      }
    } catch (err) {
      toast.error(`Export failed: ${err?.message ?? err}`);
    } finally {
      setBusy(false);
    }
  };

  // ─── Keyboard ───────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (event) => {
      if (isTyping(document.activeElement)) return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (mod && key === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
      if (mod && key === "y") { event.preventDefault(); redo(); return; }
      if (mod && key === "a") { event.preventDefault(); setNodes(nodesRef.current.map((node) => ({ ...node, selected: true }))); return; }
      if (mod && (key === "c" || key === "d")) {
        const chosen = nodesRef.current.filter((node) => node.selected);
        if (!chosen.length) return;
        const ids = new Set(chosen.map((node) => node.id));
        clipboard.current = { nodes: chosen.map(cleanNode), edges: edgesRef.current.filter((edge) => ids.has(edge.source) && ids.has(edge.target)).map(cleanEdge) };
        if (key === "c") return;
        event.preventDefault();
      }
      if (mod && (key === "v" || key === "d") && clipboard.current) {
        event.preventDefault();
        const idMap = new Map(clipboard.current.nodes.map((node) => [node.id, uid(node.type === "lane" ? "lane" : "n")]));
        const pasted = clipboard.current.nodes.map((node) => ({ ...node, id: idMap.get(node.id), position: { x: node.position.x + 40, y: node.position.y + 40 }, selected: true }));
        const pastedEdges = clipboard.current.edges.map((edge) => ({ ...edge, id: uid("e"), source: idMap.get(edge.source), target: idMap.get(edge.target) }));
        setNodes([...nodesRef.current.map((node) => ({ ...node, selected: false })), ...pasted]);
        setEdges([...edgesRef.current, ...pastedEdges]);
        clipboard.current = { nodes: pasted.map(cleanNode), edges: pastedEdges };
        commitLive();
        return;
      }
      if (event.key === "Escape") { setQuickAdd(null); setMenu(null); setNodes(nodesRef.current.map((node) => ({ ...node, selected: false }))); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [commitLive, redo, undo]);

  useEffect(() => {
    if (!menu) return undefined;
    const close = (event) => { if (!event.target.closest("[data-flow-menu]")) setMenu(null); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menu]);

  // ─── Rendering ──────────────────────────────────────────────────────────

  const displayEdges = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    return edges.map((edge) => ({
    ...edge,
    ...autoHandles(edge, byId),
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: edge.selected ? "#2563eb" : "#64748b" },
    style: { stroke: edge.selected ? "#2563eb" : "#64748b", strokeWidth: edge.selected ? 2.5 : 1.75, ...(edge.data?.style === "dashed" ? { strokeDasharray: "6 5" } : {}) },
    labelStyle: { fontSize: 12, fontWeight: 600, fill: "#334155" },
    labelBgStyle: { fill: "#ffffff" },
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 6,
  }));
  }, [edges, nodes]);

  const contextValue = useMemo(() => ({ editingId, setEditingId, updateNodeData }), [editingId, updateNodeData]);

  return (
    <FlowEditorContext.Provider value={contextValue}>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-none flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-3 py-1.5">
          <Btn title="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}><Undo className="h-4 w-4" /></Btn>
          <Btn title="Redo (Ctrl+Y)" onClick={redo} disabled={!canRedo}><Redo className="h-4 w-4" /></Btn>
          <span className="mx-1 h-6 w-px bg-slate-200" />
          <div className="relative" data-flow-menu>
            <Btn title="Tidy up — arrange automatically" onClick={() => setMenu(menu === "tidy" ? null : "tidy")} active={menu === "tidy"}><Wand2 className="h-4 w-4" /> Tidy up <ChevronDown className="h-3 w-3" /></Btn>
            {menu === "tidy" && (
              <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <button type="button" onClick={() => tidy("TB")} className="block w-full rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">Top to bottom</button>
                <button type="button" onClick={() => tidy("LR")} className="block w-full rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">Left to right</button>
              </div>
            )}
          </div>
          <Btn title="Import Mermaid" onClick={() => setMermaidOpen(true)}><Code2 className="h-4 w-4" /> Mermaid</Btn>
          <div className="relative ml-auto" data-flow-menu>
            <Btn title="Export" onClick={() => setMenu(menu === "export" ? null : "export")} active={menu === "export"} disabled={busy}><Download className="h-4 w-4" /> Export <ChevronDown className="h-3 w-3" /></Btn>
            {menu === "export" && (
              <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <button type="button" onClick={() => runExport("png")} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"><ImageIcon className="h-4 w-4 text-blue-500" /> PNG image</button>
                <button type="button" onClick={() => runExport("svg")} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"><FileImage className="h-4 w-4 text-violet-500" /> SVG (vector)</button>
                <button type="button" onClick={() => runExport("pdf")} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"><FileText className="h-4 w-4 text-rose-500" /> PDF</button>
                <div className="my-1 h-px bg-slate-100" />
                <button type="button" onClick={() => runExport("mermaid-copy")} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"><Copy className="h-4 w-4 text-emerald-600" /> Copy as Mermaid</button>
                <button type="button" onClick={() => runExport("mermaid-file")} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"><Code2 className="h-4 w-4 text-emerald-600" /> Download .mmd</button>
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-48 flex-none overflow-y-auto border-r border-slate-200 bg-slate-50/80 p-3 md:block" aria-label="Blocks">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Blocks</p>
            <p className="mb-3 text-[11px] leading-4 text-slate-400">Drag onto the canvas or click to add.</p>
            <div className="space-y-1">
              {NODE_KINDS.map((item) => (
                <button
                  key={item.kind}
                  type="button"
                  draggable
                  onDragStart={(event) => { event.dataTransfer.setData("application/taskr-flow-kind", item.kind); event.dataTransfer.effectAllowed = "move"; }}
                  onClick={() => addAtCenter(item.kind)}
                  title={item.hint}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-white hover:shadow-sm"
                >
                  <span className="h-3 w-3 shrink-0 rounded-sm border-2" style={{ borderColor: NODE_COLORS.find((color) => color.id === item.color)?.accent }} />
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-5 space-y-1 border-t border-slate-200 pt-3 text-[11px] leading-4 text-slate-500">
              <p><strong>Connect:</strong> drag from a dot on a block.</p>
              <p><strong>Rename:</strong> double-click a block.</p>
              <p><strong>Select many:</strong> Shift + drag.</p>
              <p><strong>Delete:</strong> Del / Backspace.</p>
            </div>
          </aside>

          <div
            ref={wrapperRef}
            className="relative min-w-0 flex-1 bg-slate-100"
            onDragOver={(event) => { if (event.dataTransfer.types.includes("application/taskr-flow-kind")) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } }}
            onDrop={(event) => {
              const kind = event.dataTransfer.getData("application/taskr-flow-kind");
              if (!kind) return;
              event.preventDefault();
              const node = addNode(kind, flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }));
              commitLive();
              if (kind !== "lane") setEditingId(node.id);
            }}
          >
            <ReactFlow
              nodes={nodes}
              edges={displayEdges}
              nodeTypes={NODE_TYPES}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onConnectEnd={onConnectEnd}
              onReconnect={onReconnect}
              onNodeDragStart={onNodeDragStart}
              onNodeDrag={onNodeDrag}
              onMoveEnd={(_, next) => onViewportChange?.(next)}
              onPaneClick={() => { setQuickAdd(null); setEditingId(null); }}
              connectionMode={ConnectionMode.Loose}
              defaultEdgeOptions={{ type: "smoothstep" }}
              connectionLineStyle={{ stroke: "#2563eb", strokeWidth: 2 }}
              edgesReconnectable
              deleteKeyCode={["Delete", "Backspace"]}
              multiSelectionKeyCode={["Shift", "Meta", "Control"]}
              selectionKeyCode="Shift"
              snapToGrid
              snapGrid={[10, 10]}
              minZoom={0.1}
              maxZoom={2.5}
              {...(viewport ? { defaultViewport: viewport } : { fitView: true, fitViewOptions: { padding: 0.2 } })}
            >
              <Background gap={20} size={1.2} color="#cbd5e1" />
              <Controls showInteractive={false} position="bottom-left" />
              <MiniMap pannable zoomable position="bottom-right" nodeColor={(node) => (node.type === "lane" ? "#e2e8f0" : NODE_COLORS.find((color) => color.id === node.data?.color)?.accent ?? "#64748b")} maskColor="rgba(241,245,249,0.7)" />
            </ReactFlow>
            {!nodes.length && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="max-w-sm rounded-2xl border border-dashed border-slate-300 bg-white/95 p-6 text-center shadow-sm">
                  <LayoutGrid className="mx-auto h-6 w-6 text-violet-500" />
                  <p className="mt-2 text-sm font-bold text-slate-800">Empty canvas</p>
                  <p className="mt-1 text-xs text-slate-500">Drag blocks from the left, or paste Mermaid text with the Mermaid button.</p>
                </div>
              </div>
            )}
          </div>

          <Inspector
            nodes={nodes}
            edges={edges}
            onNodeData={updateNodeData}
            onNodeKind={changeKind}
            onEdge={updateEdge}
            onDelete={deleteSelection}
            onAlign={(mode) => applyPatches(alignBlocks(asBoxes(), mode))}
            onDistribute={(axis) => applyPatches(distributeBlocks(asBoxes(), axis))}
            onReverse={reverseEdge}
          />
        </div>

        {quickAdd && (
          <div className="fixed z-[90] w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl" style={{ left: quickAdd.x + 8, top: quickAdd.y + 8 }} data-flow-menu>
            <div className="mb-1 flex items-center justify-between px-2 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Add next</span>
              <button type="button" onClick={() => setQuickAdd(null)} aria-label="Close" className="text-slate-400 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>
            </div>
            {NODE_KINDS.filter((item) => item.kind !== "lane").map((item) => (
              <button key={item.kind} type="button" onClick={() => chooseQuickAdd(item.kind)} className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50">{item.label}</button>
            ))}
          </div>
        )}
        {mermaidOpen && <MermaidDialog hasContent={nodes.length > 0} onClose={() => setMermaidOpen(false)} onImport={importScene} />}
      </div>
    </FlowEditorContext.Provider>
  );
}

export default function FlowEditor(props) {
  return (
    <ReactFlowProvider>
      <Editor {...props} />
    </ReactFlowProvider>
  );
}
