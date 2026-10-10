import { useState } from "react";
import { useDocumentHistory } from "../workspace/useDocumentHistory";
import { layoutScene } from "./layout";
import { TEMPLATES } from "./model";
import FlowEditor from "./editor/FlowEditor";

/** Development-only: the real Flow editor with in-memory data (not routed in production). */
export default function DevFlowPlayground() {
  const [initial] = useState(() => layoutScene(TEMPLATES.find((template) => template.id === "flow").build(), "TB"));
  const history = useDocumentHistory(initial);
  return (
    <div className="flex h-screen flex-col">
      <div className="flex-none bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-900">Dev playground — not saved</div>
      <FlowEditor scene={history.content} commit={history.commit} undo={history.undo} redo={history.redo} canUndo={history.canUndo} canRedo={history.canRedo} title="Dev flow" viewport={null} />
    </div>
  );
}
