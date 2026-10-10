import { getNodesBounds, getViewportForBounds } from "@xyflow/react";
import { toJpeg, toPng, toSvg } from "html-to-image";
import { downloadBlob, jpegPagesToPdf, safeFilename } from "../../../lib/pdf";
import { toMermaid } from "../mermaid";

const PADDING = 48;

/** Hides React Flow chrome (handles, resizers, minimap, controls) in exports. */
const exportFilter = (node) => {
  const classes = node.classList;
  if (!classes) return true;
  return !["react-flow__handle", "react-flow__resize-control", "react-flow__minimap", "react-flow__controls", "react-flow__panel"].some((name) => classes.contains(name));
};

/** Renders every node at 1:1 into an image of the diagram's bounds. */
export async function exportFlowImage(wrapper, nodes, title, format) {
  const viewportElement = wrapper.querySelector(".react-flow__viewport");
  const bounds = getNodesBounds(nodes);
  const width = Math.ceil(bounds.width + PADDING * 2);
  const height = Math.ceil(bounds.height + PADDING * 2);
  const viewport = getViewportForBounds(bounds, width, height, 1, 1, 0);
  const options = {
    backgroundColor: "#ffffff",
    width,
    height,
    filter: exportFilter,
    style: { width: `${width}px`, height: `${height}px`, transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` },
  };
  const name = safeFilename(title, "taskr-flow");

  if (format === "svg") {
    const dataUrl = await toSvg(viewportElement, options);
    downloadBlob(await (await fetch(dataUrl)).blob(), `${name}.svg`);
    return;
  }
  if (format === "png") {
    const dataUrl = await toPng(viewportElement, { ...options, pixelRatio: 2 });
    downloadBlob(await (await fetch(dataUrl)).blob(), `${name}.png`);
    return;
  }
  // PDF: one page sized to the diagram (landscape or portrait), with a margin.
  const jpeg = await toJpeg(viewportElement, { ...options, pixelRatio: 2, quality: 0.94 });
  const pageWidth = width >= height ? 841.89 : 595.28;
  const pageHeight = width >= height ? 595.28 : 841.89;
  downloadBlob(jpegPagesToPdf([{ jpegDataUrl: jpeg, width: width * 2, height: height * 2 }], { pageSize: { width: pageWidth, height: pageHeight }, margin: 24 }), `${name}.pdf`);
}

export async function exportFlowMermaid(scene, title, toClipboard) {
  const text = toMermaid(scene, scene.direction ?? "TB");
  if (toClipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }
  downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `${safeFilename(title, "taskr-flow")}.mmd`);
}
