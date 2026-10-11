# 07 — Flow (redefined)

## Purpose
**Diagrams that stay tidy by themselves.** Flowcharts, data flows, system maps, ER diagrams and swimlanes are built by connecting blocks; one click arranges everything neatly, and diagrams can be written or copied as text (Mermaid).

## Current state → problems
| Today | Problem |
|---|---|
| Custom editor on a fixed 1440×900 canvas | Large diagrams don't fit; no panning |
| Straight-line edges from node centre to node centre | Messy crossings; arrows don't route around blocks |
| Connect = pick source, then target (two clicks in a mode) | Slower than dragging from a handle |
| One diagram per user in localStorage | No list, no sync |
| No Save-to-Home integration | Disconnected from the rest of the app |
| No alignment help, no multi-select | Tidying is manual |

## Feature set
**Must (this phase)**
1. **Diagrams list** (`/flow`): create from a template or blank; pin, archive, duplicate, search.
2. **Rebuild on React Flow (`@xyflow/react`)**: an infinite canvas with pan/zoom, minimap, fit-view, snap-to-grid, and multi-select (box or Shift).
3. **Custom node types** (ported from the current 9): terminator, process, decision (diamond), data (parallelogram), store (cylinder), document, external entity, note, swimlane (a group node that children move with). 4 handles per node (top/right/bottom/left).
4. **Connections by dragging from a handle**; orthogonal `smoothstep` edges by default, with options for straight, bezier and step; arrowheads; editable labels; solid or dashed; edge reconnect.
5. **Auto-layout (dagre)**: a "Tidy up" button with top-to-bottom / left-to-right direction; animates nodes into place; one undo step. Swimlane-aware: lays out inside each lane.
6. **Mermaid import/export** (stand-out): paste `flowchart TD` / `graph LR` text → nodes + edges + auto-layout. Export the current diagram as Mermaid text to paste into GitHub or Notion. Deterministic parser for the flowchart subset (node shapes `[ ]`, `( )`, `{ }`, `[( )]`, `[/ /]`; edges `-->`, `---`, `-.->`, `-- label -->`). Unsupported syntax gets a clear error line, not silence.
7. **Keep templates** (process flow, data flow, system map, ERD, interaction map, swimlanes) as data, now auto-laid-out.
8. **Inspector panel** for the selection: label, colour, shape type, edge style/label; align and distribute for multi-select.
9. **Export**: PNG, SVG, PDF (reuse the existing hand-written PDF writer), plus Mermaid text.
10. **Cloud autosave** to `flows` with `viewport` restored on open; undo/redo (100 steps) on commit events.

**Should**
- Copy/paste and duplicate (Ctrl+C/V/D), including between diagrams.
- Quick-add: drag from a handle into empty space → a popup to pick the next block type, connected automatically (Whimsical-style speed).
- Node notes / descriptions shown on hover.

**Could**
- A node linked to a sticker task: the task's done-state shows as a check on the node (phase 6).
- ER table nodes with field rows.

## Stand-out
**Draw fast → press "Tidy up" → paste as Mermaid anywhere.** That combines Whimsical's speed, draw.io's neatness and the portability of text diagrams in one small editor.

## Data
`flows.scene` (version 2): `{ version: 2, nodes: [{ id, type, position: {x, y}, data: { label, color, ... }, width, height, parentId? }], edges: [{ id, source, sourceHandle, target, targetHandle, type, label, data: { style } }] }` — React Flow's own shape, so no conversion layer. `migrateFlow(v1)` converts the current format (nodes with x/y/width/height, edges with source/target/label/style).

## Implementation notes
- `features/flow/FlowEditor.jsx` (ReactFlowProvider), `nodes/*.jsx` (SVG shapes), `layout.js` (dagre wrapper, pure), `mermaid.js` (parse/serialise, pure + unit-testable), `api.js`.
- Remove the old `FlowWorkspace.jsx` after the migration has been verified on saved diagrams.

## Acceptance checks
- Draw 8 messy nodes → Tidy up gives a clean layered layout with no overlaps; undo restores the previous layout in one step.
- Paste this text and get the correct diagram:
  ```
  flowchart TD
    A[Start] --> B{OK?}
    B -- yes --> C[Ship]
    B -- no --> D[Fix] --> B
  ```
- Export → re-import the Mermaid → same structure.
- Open on another browser → same diagram and viewport.
