import { createContext, memo, useContext, useEffect, useRef, useState } from "react";
import { Handle, NodeResizer, Position } from "@xyflow/react";
import { kindInfo, toneOf } from "../model";

/** Lets node components edit labels and commit to history. */
export const FlowEditorContext = createContext(null);
export const useFlowEditor = () => useContext(FlowEditorContext);

const HANDLES = [
  { id: "t", position: Position.Top },
  { id: "r", position: Position.Right },
  { id: "b", position: Position.Bottom },
  { id: "l", position: Position.Left },
];

function EditableLabel({ id, label, className = "", align = "center" }) {
  const { editingId, setEditingId, updateNodeData } = useFlowEditor();
  const editing = editingId === id;
  const [draft, setDraft] = useState(label);
  const ref = useRef(null);

  useEffect(() => { if (!editing) setDraft(label); }, [label, editing]);
  useEffect(() => {
    if (editing) { ref.current?.focus(); ref.current?.select(); }
  }, [editing]);

  const finish = () => {
    setEditingId(null);
    if (draft !== label) updateNodeData(id, { label: draft });
  };

  if (editing) {
    return (
      <textarea
        ref={ref}
        value={draft}
        rows={Math.max(1, draft.split("\n").length)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={finish}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); finish(); }
          if (event.key === "Escape") { event.preventDefault(); setDraft(label); setEditingId(null); }
        }}
        className={`nodrag nowheel relative z-10 w-[90%] resize-none rounded-md border border-amber-400 bg-white px-2 py-1 text-xs font-semibold text-stone-800 outline-none ring-2 ring-amber-100 ${align === "left" ? "text-left" : "text-center"}`}
        aria-label="Node label"
      />
    );
  }
  return <span className={`relative z-10 whitespace-pre-line px-3 text-xs font-semibold leading-5 text-stone-800 ${align === "left" ? "text-left" : "text-center"} ${className}`}>{label}</span>;
}

// Each side has a source and a target handle with the same id, so a
// connector can start or end on any side (React Flow keeps them apart by type).
function Handles() {
  return HANDLES.flatMap((handle) => [
    <Handle key={`${handle.id}-target`} id={handle.id} type="target" position={handle.position} className="taskr-flow-handle" />,
    <Handle key={`${handle.id}-source`} id={handle.id} type="source" position={handle.position} className="taskr-flow-handle" />,
  ]);
}

export const ShapeNode = memo(function ShapeNode({ id, data, selected }) {
  const tone = toneOf(data.color);
  const info = kindInfo(data.kind);
  const { setEditingId } = useFlowEditor();
  const surface = { borderColor: tone.accent, backgroundColor: tone.surface };
  const label = <EditableLabel id={id} label={data.label} />;
  let body;

  if (data.kind === "decision" || data.kind === "data") {
    const points = data.kind === "decision" ? "50,1 99,50 50,99 1,50" : "14,2 99,2 86,98 1,98";
    body = (
      <div className="relative flex h-full w-full items-center justify-center">
        <svg aria-hidden className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon points={points} fill={tone.surface} stroke={tone.accent} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
        {label}
      </div>
    );
  } else if (data.kind === "store") {
    body = (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.2rem] border-2 pt-3" style={surface}>
        <div className="absolute inset-x-[-2px] top-[-1px] h-6 rounded-[50%] border-2" style={surface} />
        {label}
      </div>
    );
  } else if (data.kind === "document") {
    body = (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg border-2" style={surface}>
        <span className="absolute right-0 top-0 h-6 w-6 border-b-2 border-l-2 bg-white/70" style={{ borderColor: tone.accent }} />
        {label}
      </div>
    );
  } else if (data.kind === "note") {
    body = (
      <div className="relative flex h-full w-full items-center justify-center rounded-md border-2 border-dashed" style={surface}>
        {label}
      </div>
    );
  } else {
    const shape = data.kind === "terminator" ? "rounded-full" : data.kind === "external" ? "rounded-md border-double border-[5px]" : "rounded-xl";
    body = <div className={`relative flex h-full w-full items-center justify-center border-2 ${shape}`} style={surface}>{label}</div>;
  }

  return (
    <div className="h-full w-full" onDoubleClick={() => setEditingId(id)} title={info.label}>
      <NodeResizer isVisible={selected} minWidth={80} minHeight={44} lineClassName="!border-amber-500" handleClassName="!h-2.5 !w-2.5 !rounded-sm !border-amber-600 !bg-white" />
      {body}
      <Handles />
    </div>
  );
});

export const LaneNode = memo(function LaneNode({ id, data, selected }) {
  const { setEditingId } = useFlowEditor();
  return (
    <div className={`h-full w-full rounded-xl border-2 border-dashed ${selected ? "border-amber-400" : "border-stone-300"} bg-stone-50/70`} onDoubleClick={() => setEditingId(id)}>
      <NodeResizer isVisible={selected} minWidth={360} minHeight={100} lineClassName="!border-amber-500" handleClassName="!h-2.5 !w-2.5 !rounded-sm !border-amber-600 !bg-white" />
      <div className="flex h-full w-[140px] items-center border-r border-dashed border-stone-300 px-4">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500"><EditableLabel id={id} label={data.label} align="left" className="!px-0" /></span>
      </div>
    </div>
  );
});

export const NODE_TYPES = { shape: ShapeNode, lane: LaneNode };
