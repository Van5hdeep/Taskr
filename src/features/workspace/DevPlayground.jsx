import { useState } from "react";
import { emptyContent } from "./model";
import { useDocumentHistory } from "./useDocumentHistory";
import DocumentEditor from "./editor/DocumentEditor";

/**
 * Development-only: the real editor with in-memory content, so layout and
 * input behaviour (e.g. handwriting alignment) can be checked without signing
 * in. Not routed in production builds; nothing is saved.
 */
export default function DevPlayground() {
  const [initial] = useState(() => {
    const content = emptyContent();
    content.pages.push({ id: "dev-page-2" });
    return content;
  });
  const history = useDocumentHistory(initial);
  const [pageStyle, setPageStyle] = useState("lined");
  return (
    <div className="flex h-screen flex-col">
      <div className="flex-none bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-900">Dev playground — not saved</div>
      <DocumentEditor
        documentId="dev"
        title="Dev playground"
        content={history.content}
        commit={history.commit}
        undo={history.undo}
        redo={history.redo}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        pageStyle={pageStyle}
        onPageStyleChange={setPageStyle}
      />
    </div>
  );
}
