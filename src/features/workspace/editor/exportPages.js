import { toCanvas } from "html-to-image";
import { exportToCanvas, restoreElements } from "@excalidraw/excalidraw";
import { A4_POINTS, downloadBlob, jpegPagesToPdf, safeFilename } from "../../../lib/pdf";
import { A4_HEIGHT, A4_WIDTH, inkPageIndex, PAGE_STEP } from "../model";

const SCALE = 2;

/** Invisible 1×1 markers at the page corners pin the ink export to the page's exact bounds. */
function cornerAnchors(top) {
  const anchor = (x, y) => ({ type: "rectangle", x, y, width: 1, height: 1, strokeColor: "transparent", backgroundColor: "transparent", opacity: 0, id: `anchor-${x}-${y}` });
  return restoreElements([anchor(0, top), anchor(A4_WIDTH - 1, top + A4_HEIGHT - 1)], null);
}

/** Page DOM (blocks, background) + its handwriting → one canvas. */
export async function renderPage(pageElement, ink, pageIndex, pageCount) {
  const canvas = await toCanvas(pageElement, {
    pixelRatio: SCALE,
    backgroundColor: "#ffffff",
    filter: (node) => !(node.dataset && "exportIgnore" in node.dataset),
  });
  const pageInk = ink.filter((element) => !element.isDeleted && inkPageIndex(element, pageCount) === pageIndex);
  if (pageInk.length) {
    const inkCanvas = await exportToCanvas({
      elements: [...restoreElements(pageInk, null), ...cornerAnchors(pageIndex * PAGE_STEP)],
      appState: { exportBackground: false, viewBackgroundColor: "transparent", exportWithDarkMode: false },
      files: null,
      exportPadding: 0,
      getDimensions: (width, height) => ({ width: width * SCALE, height: height * SCALE, scale: SCALE }),
    });
    canvas.getContext("2d").drawImage(inkCanvas, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

async function renderAll(pageElements, ink) {
  const canvases = [];
  for (let i = 0; i < pageElements.length; i += 1) canvases.push(await renderPage(pageElements[i], ink, i, pageElements.length));
  return canvases;
}

export async function exportPdf(pageElements, ink, title) {
  const canvases = await renderAll(pageElements, ink);
  const blob = jpegPagesToPdf(canvases.map((canvas) => ({ jpegDataUrl: canvas.toDataURL("image/jpeg", 0.92), width: canvas.width, height: canvas.height })), { pageSize: A4_POINTS });
  downloadBlob(blob, `${safeFilename(title, "taskr-document")}.pdf`);
}

export async function exportPng(pageElement, ink, pageIndex, pageCount, title) {
  const canvas = await renderPage(pageElement, ink, pageIndex, pageCount);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  downloadBlob(blob, `${safeFilename(title, "taskr-document")}-page-${pageIndex + 1}.png`);
}

/** Prints exact page images through a hidden frame (A4, no browser margins). */
export async function printPages(pageElements, ink, title) {
  const canvases = await renderAll(pageElements, ink);
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(`<!doctype html><html><head><title>${title.replace(/</g, "&lt;")}</title><style>@page{size:A4;margin:0}html,body{margin:0}img{display:block;width:210mm;height:297mm;page-break-after:always}img:last-child{page-break-after:auto}</style></head><body>${canvases.map((canvas) => `<img src="${canvas.toDataURL("image/jpeg", 0.92)}">`).join("")}</body></html>`);
  doc.close();
  await new Promise((resolve) => { if (doc.readyState === "complete") resolve(); else frame.onload = resolve; });
  await Promise.all([...doc.images].map((img) => (img.complete ? null : new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; }))));
  frame.contentWindow.focus();
  frame.contentWindow.print();
  setTimeout(() => frame.remove(), 60_000);
}
