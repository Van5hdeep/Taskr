// Minimal PDF writer: one JPEG per page, no dependencies.
// Page sizes are in PDF points (1/72 inch). A4 portrait = 595.28 × 841.89.

export const A4_POINTS = { width: 595.28, height: 841.89 };

function base64ToBytes(dataUrl) {
  const binary = atob(dataUrl.split(",")[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * pages: [{ jpegDataUrl, width, height }] (pixel size of each JPEG)
 * options.pageSize: { width, height } in points (default A4), or "fit" to
 * centre each image on a page of that size with a margin.
 */
export function jpegPagesToPdf(pages, { pageSize = A4_POINTS, margin = 0 } = {}) {
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [];
  let length = 0;
  const push = (bytes) => { chunks.push(bytes); length += bytes.length; };
  const pushText = (text) => push(encoder.encode(text));

  pushText("%PDF-1.4\n%âãÏÓ\n");
  const pageIds = pages.map((_, index) => 3 + index * 3);
  const objectStart = (id) => { offsets[id] = length; };

  objectStart(1);
  pushText("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objectStart(2);
  pushText(`2 0 obj\n<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>\nendobj\n`);

  pages.forEach((page, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    const scale = Math.min((pageSize.width - margin * 2) / page.width, (pageSize.height - margin * 2) / page.height);
    const w = page.width * scale;
    const h = page.height * scale;
    const x = (pageSize.width - w) / 2;
    const y = (pageSize.height - h) / 2;
    const content = `q\n${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im0 Do\nQ\n`;
    const jpeg = base64ToBytes(page.jpegDataUrl);

    objectStart(pageId);
    pushText(`${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageSize.width} ${pageSize.height}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`);
    objectStart(contentId);
    pushText(`${contentId} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);
    objectStart(imageId);
    pushText(`${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    push(jpeg);
    pushText("\nendstream\nendobj\n");
  });

  const count = 3 + pages.length * 3;
  const xrefOffset = length;
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let id = 1; id < count; id += 1) xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  pushText(xref);
  return new Blob(chunks, { type: "application/pdf" });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(title, fallback = "taskr") {
  return String(title || fallback).trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || fallback;
}
