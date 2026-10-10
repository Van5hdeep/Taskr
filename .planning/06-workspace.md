# 06 — Workspace (redefined)

## Purpose
**Paper-like documents where anything can go anywhere**: text, tables, shapes, images, sticky notes and handwriting on real A4 pages that print and export exactly as seen. This free-placement "digital notebook" (OneNote-style) is what Notion lacks, and the print fidelity is what whiteboards lack. That is the niche to own.

## Current state → problems
| Today | Problem |
|---|---|
| One document per user in localStorage | Can't have more than one note; not synced |
| Images stored as base64 inside the document | Hits the ~5MB localStorage limit fast; slow |
| Two ink systems (legacy canvas + Excalidraw); Excalidraw loaded in the main bundle | Merged into Excalidraw only, lazy-loaded with the Workspace route |
| Formatting applies to the whole text box | No per-word bold, lists, headings or links |
| Tables: fixed rows/cols after creation | Can't add or remove rows or columns |
| Keyboard handler has stale closures (`updateBlock`, `deleteBlock`, `duplicateBlock` missing from deps) | Shortcuts act on outdated state |
| Every text keystroke (debounced) pushes a history entry; 60-step cap | Undo granularity is odd |
| "Save" only renames | No export to PDF; no document list |
| Delete page removes its blocks but not its ink | Orphaned strokes |
| Component named `TableWorkspace` | Misleading |

## Feature set
**Must (this phase)**
1. **Documents list** (`/workspace`): grid/list of documents with title, updated time, pin, archive, duplicate, search. Opening one goes to `/workspace/:docId`.
2. **Cloud autosave** of `documents.content` (debounced) with a status pill; crash buffer in localStorage.
3. **Images → Supabase Storage** (`workspace-assets/{uid}/{docId}/...`): upload with progress, drag-drop and paste from the clipboard, resize, aspect-lock with Shift.
4. **Ink stays on Excalidraw** (decision 2026-10-11: owner prefers it; MIT licence). Pen, highlighter (low-opacity freedraw), Excalidraw eraser, colour and width, with its toolbar hidden. Ink lives in `content.ink` as Excalidraw elements in document coordinates; page delete/reorder moves strokes with their page. The legacy canvas annotations are converted to freedraw elements. Excalidraw loads only with the Workspace route chunk.
5. **Rich text boxes (Tiptap)**: bold, italic, underline, strike, highlight, text colour, headings H1–H3, bullet/numbered/check lists, links, alignment. The toolbar acts on the selection, not the whole box. Existing plain text boxes are migrated to Tiptap JSON (the old box-level styles become marks on all text).
6. **Tables**: add/remove row and column (context menu on a cell), Tab moves between cells, column resize, header-row toggle.
7. **Selection**: multi-select (Shift-click, box-select), group move, align/distribute, bring forward / send back, snap-to-guides against page margins and other blocks.
8. **Pages**: page style (plain / lined / grid / dotted); delete a page removes its blocks *and* ink; reorder pages.
9. **Export**: PDF (all pages, vector text where possible; at minimum rasterised at 2× per page) and PNG of the current page; Print.
10. **Correct undo/redo**: history entries on *commit* (drag end, text blur or 1 s idle, insert, delete), not per debounced keystroke; 100 steps.

**Should**
- Templates: blank, lined notes, meeting notes, weekly planner, Cornell notes.
- Find in document (Ctrl+F) across text boxes and tables.
- An outline panel listing the headings in the document, for long notes.

**Could**
- Embed a live sticker list or a flow diagram preview block (phase 6).
- Version snapshots ("restore yesterday's version") via a `document_versions` table.

## Stand-out
The **free-placement A4 notebook with handwriting, rich text and tables, which prints exactly as it looks** and syncs everywhere. It is lighter than OneNote, more structured than a whiteboard, and freer than Notion.

## Data
`documents.content` (version 2):
```json
{
  "version": 2,
  "pages": [{ "id": "p1", "style": "plain" }],
  "blocks": [{ "id": "...", "pageId": "p1", "type": "text|table|shape|sticker|image", "x": 0, "y": 0, "width": 0, "height": 0, "z": 0, "...type-specific": "" }],
  "ink": [ /* Excalidraw elements, document coordinates */ ]
}
```
Text block `doc` = Tiptap JSON. Image block `src` = storage path (signed URL resolved at render).

## Implementation notes
- Rename to `features/workspace/DocumentEditor.jsx`; split blocks into `blocks/*.jsx`, ink into `ink/InkLayer.jsx`, and history into `useDocumentHistory.js`.
- The `useDraggableResizable` pattern stays, extended for multi-select.
- A loader migrates v1 (current localStorage shape) → v2 in a pure function `migrateDocument(v1)`. It is used by the localStorage import and by any old row.

## Acceptance checks
- Create 3 documents; each reopens with exactly its own content on another browser.
- Paste a screenshot → uploaded to Storage; the document JSON holds only a path.
- Bold one word inside a text box; the rest is unchanged.
- Ink with a pen looks pressure-sensitive; the eraser removes whole strokes; undo restores them.
- Excalidraw is only downloaded when the Workspace is opened (not on landing, auth or other tools).
- The exported PDF matches the on-screen pages.
