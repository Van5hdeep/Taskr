import { useEffect, useRef, useState } from "react";
import { CaptureUpdateAction, Excalidraw, restoreElements } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { A4_WIDTH } from "../model";

const live = (elements) => elements.filter((element) => !element.isDeleted);
const signatureOf = (elements) => JSON.stringify(live(elements).map((element) => [element.id, element.version]));

/**
 * Excalidraw powers the handwriting layer only: its UI is hidden and TASKR's
 * toolbar drives it. Elements live in document coordinates, so one canvas
 * spans every page. Finished strokes are committed to TASKR's history, which
 * also owns undo/redo.
 */
export default function InkLayer({ elements, onCommit, tool, color, width, zoom, documentHeight, locked }) {
  const [api, setApi] = useState(null);
  const signature = useRef(signatureOf(elements));
  const syncing = useRef(false);
  const initialData = useRef({
    elements: restoreElements(elements, null),
    appState: { viewBackgroundColor: "transparent", scrollX: 0, scrollY: 0, zoom: { value: zoom } },
  });
  const inkActive = !locked && ["pen", "highlighter", "eraser"].includes(tool);

  // History changes (undo/redo, page deletes) flow back into the canvas.
  useEffect(() => {
    if (!api) return;
    const next = signatureOf(elements);
    if (next === signature.current) return;
    signature.current = next;
    syncing.current = true;
    api.updateScene({ elements: restoreElements(elements, null), captureUpdate: CaptureUpdateAction.NEVER });
    syncing.current = false;
  }, [api, elements]);

  useEffect(() => {
    if (!api) return;
    const highlighter = tool === "highlighter";
    api.updateScene({
      appState: {
        currentItemStrokeColor: color,
        currentItemStrokeWidth: highlighter ? Math.max(width * 4, 12) : width,
        currentItemOpacity: highlighter ? 35 : 100,
        currentItemRoughness: 0,
        currentItemStrokeStyle: "solid",
        zoom: { value: zoom },
        scrollX: 0,
        scrollY: 0,
      },
      captureUpdate: CaptureUpdateAction.NEVER,
    });
    api.setActiveTool({ type: tool === "eraser" ? "eraser" : inkActive ? "freedraw" : "selection", locked: inkActive });
  }, [api, tool, color, width, zoom, inkActive]);

  return (
    <div
      className="taskr-excalidraw-ink absolute left-0 top-0 z-[25]"
      data-export-ignore
      style={{
        pointerEvents: inkActive ? "auto" : "none",
        width: A4_WIDTH * zoom,
        height: documentHeight * zoom,
        transform: `scale(${1 / zoom})`,
        transformOrigin: "top left",
      }}
      aria-label="Handwriting layer"
      onWheelCapture={(event) => event.stopPropagation()}
    >
      <Excalidraw
        excalidrawAPI={setApi}
        initialData={initialData.current}
        onChange={(next, appState) => {
          if (syncing.current || appState.cursorButton === "down") return;
          const nextSignature = signatureOf(next);
          if (nextSignature === signature.current) return;
          signature.current = nextSignature;
          onCommit(JSON.parse(JSON.stringify(live(next))));
        }}
        theme="light"
        zenModeEnabled
        autoFocus={false}
        handleKeyboardGlobally={false}
        detectScroll={false}
        UIOptions={{
          tools: { image: false },
          canvasActions: { changeViewBackgroundColor: false, clearCanvas: false, export: false, loadScene: false, saveToActiveFile: false, saveAsImage: false, toggleTheme: false },
        }}
      />
    </div>
  );
}
