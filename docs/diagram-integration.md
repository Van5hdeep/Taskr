# Workspace and Flow

Workspace retains TASKR's A4 document UI, text boxes, tables, and shapes. Its ink layer uses the installed `@excalidraw/excalidraw` package (0.18.1) with the package toolbar hidden. Ink participates in document undo/redo and local persistence. The eraser removes whole strokes. Document zoom controls both the paper and ink coordinates.

Flow is a separate React/SVG diagram editor, with editable and draggable nodes, directional connections, connection labels, templates, local saving, zoom, and undo/redo. Templates cover process flows, data flows, system maps, entity relationships, interaction maps, and swimlanes. Interaction maps are not a full sequence-diagram notation engine, and swimlanes are visual responsibility regions, not a BPMN execution engine.

## Sources and licensing

- Excalidraw: https://github.com/excalidraw/excalidraw — MIT-licensed package used through its public React API. Retain the package's upstream license notices when distributing dependencies.
- Eraser agent repository: https://github.com/eraserlabs/eraser-io
- Eraser license: https://github.com/eraserlabs/eraser-io/blob/main/LICENSE
- Diagram categories reviewed: https://github.com/eraserlabs/eraser-io/blob/main/skills/eraser-diagrams/SKILL.md

The Eraser repository supplies agent instructions and integrations with Eraser's hosted rendering API, not the source of its web editor. Its MIT license applies to that repository; it does not grant rights to Eraser's hosted product. TASKR's Flow implementation and sample diagrams are original code. No Eraser source, branding, API credentials, or hosted rendering service is included. Existing Excalidraw Flow storage (`taskr_flow_scene_*`) is left untouched; native Flow documents use `taskr_flow_diagram_*`.

Document data is saved in the current browser for the signed-in user; these editors do not yet sync their documents across devices. Workspace uses `taskr_workspace_document_*`. Exported or browser-stored diagrams should be backed up before clearing browser storage.
