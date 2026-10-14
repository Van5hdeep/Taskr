import { toCanvas } from "html-to-image";
import { A4_POINTS, downloadBlob, jpegPagesToPdf, safeFilename } from "../../../lib/pdf";
import { renderInkPage } from "./ink/render";

const SCALE = 2;

/** Page DOM (blocks, background) + its handwriting → one canvas. */
export async function renderPage(pageElement, ink, pageIndex, pageCount) {
  const canvas = await toCanvas(pageElement, {
    pixelRatio: SCALE,
    backgroundColor: "#ffffff",
    filter: (node) => !(node.dataset && "exportIgnore" in node.dataset),
  });
  if (ink.some((element) => !element.isDeleted)) {
    canvas.getContext("2d").drawImage(renderInkPage(ink, pageIndex, pageCount, SCALE), 0, 0, canvas.width, canvas.height);
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
