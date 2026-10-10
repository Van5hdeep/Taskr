import { describe, expect, it } from "vitest";
import { jpegPagesToPdf, safeFilename } from "./pdf";

// 1×1 JPEG
const JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

describe("jpegPagesToPdf", () => {
  it("writes a valid multi-page PDF skeleton with a consistent xref", async () => {
    const blob = jpegPagesToPdf([{ jpegDataUrl: JPEG, width: 1, height: 1 }, { jpegDataUrl: JPEG, width: 1, height: 1 }]);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const text = new TextDecoder("latin1").decode(bytes);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("/Count 2");
    expect(text).toContain("/Kids [3 0 R 6 0 R]");
    expect(text.trim().endsWith("%%EOF")).toBe(true);
    // Every xref offset must point at the start of "<id> 0 obj".
    const xrefAt = Number(text.match(/startxref\n(\d+)/)[1]);
    const rows = text.slice(xrefAt).split("\n").slice(3, 3 + 8);
    rows.forEach((row, index) => {
      const offset = Number(row.slice(0, 10));
      expect(text.slice(offset, offset + 12)).toMatch(new RegExp(`^${index + 1} 0 obj`));
    });
  });

  it("makes safe file names", () => {
    expect(safeFilename("My Notes: Week 1!")).toBe("my-notes-week-1");
    expect(safeFilename("   ")).toBe("taskr");
  });
});
