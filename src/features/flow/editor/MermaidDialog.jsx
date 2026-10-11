import { useMemo, useState } from "react";
import { AlertTriangle, Info } from "../../../lib/icons";
import Modal from "../../../components/ui/Modal";
import { parseMermaid } from "../mermaid";

const EXAMPLE = `flowchart TD
  A([Start]) --> B[Capture the idea]
  B --> C{Worth doing?}
  C -- yes --> D[Plan it]
  C -- no --> E([Park it])
  D --> F[(Backlog)]`;

/** Paste Mermaid flowchart text → preview counts and problems → import. */
export default function MermaidDialog({ hasContent, onClose, onImport }) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState(hasContent ? "add" : "replace");
  const parsed = useMemo(() => (text.trim() ? parseMermaid(text) : null), [text]);
  const nodeCount = parsed?.scene.nodes.filter((node) => node.type !== "lane").length ?? 0;
  const laneCount = parsed?.scene.nodes.filter((node) => node.type === "lane").length ?? 0;
  const canImport = parsed && !parsed.errors.length && nodeCount > 0;

  return (
    <Modal
      title="Import Mermaid"
      description="Paste a Mermaid flowchart. taskr lays it out and you can keep editing it visually."
      onClose={onClose}
      size="lg"
      footer={(
        <>
          <button type="button" onClick={() => setText(EXAMPLE)} className="mr-auto rounded-xl px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100">Use an example</button>
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100">Cancel</button>
          <button type="button" disabled={!canImport} onClick={() => onImport(parsed, mode)} className="rounded-xl bg-stone-900 dark:bg-amber-400 dark:text-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800 dark:hover:bg-amber-300 disabled:opacity-40">Import</button>
        </>
      )}
    >
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={12}
        spellCheck={false}
        placeholder={EXAMPLE}
        aria-label="Mermaid text"
        className="w-full resize-y rounded-xl border border-stone-200 bg-stone-50 p-3 font-mono text-xs text-stone-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
      />
      {parsed && (
        <div className="mt-3 space-y-2 text-xs">
          {parsed.errors.map((error) => <p key={error} className="flex items-start gap-1.5 font-semibold text-red-600"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>)}
          {parsed.warnings.map((warning) => <p key={warning} className="flex items-start gap-1.5 text-amber-700"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{warning}</p>)}
          {!parsed.errors.length && <p className="text-stone-600">{nodeCount} blocks, {parsed.scene.edges.length} connectors{laneCount ? `, ${laneCount} swimlanes` : ""} · {parsed.direction === "LR" || parsed.direction === "RL" ? "left to right" : "top to bottom"}</p>}
        </div>
      )}
      {hasContent && (
        <div className="mt-4 flex gap-4 text-sm text-stone-700">
          <label className="inline-flex items-center gap-2"><input type="radio" name="mermaid-mode" checked={mode === "add"} onChange={() => setMode("add")} className="accent-amber-600" /> Add to this diagram</label>
          <label className="inline-flex items-center gap-2"><input type="radio" name="mermaid-mode" checked={mode === "replace"} onChange={() => setMode("replace")} className="accent-amber-600" /> Replace this diagram</label>
        </div>
      )}
      <p className="mt-4 text-[11px] text-stone-400">Supported: flowchart/graph TD·LR, shapes [ ] ( ) ([ ]) (( )) {"{ }"} [( )] [/ /] [[ ]] &gt; ], arrows --&gt; --- -.-&gt; ==&gt; with labels, &amp; groups and subgraphs (as swimlanes).</p>
    </Modal>
  );
}
