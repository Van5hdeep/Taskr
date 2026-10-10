// Global overlays (command palette, quick capture, shortcut sheet) live in
// AppShell; any screen can open them through these events.
export const PALETTE_EVENT = "taskr:open-palette";
export const CAPTURE_EVENT = "taskr:open-capture";
export const SHORTCUTS_EVENT = "taskr:open-shortcuts";

export const openCommandPalette = () => window.dispatchEvent(new Event(PALETTE_EVENT));
export const openQuickCapture = (mode = "task") => window.dispatchEvent(new CustomEvent(CAPTURE_EVENT, { detail: { mode: typeof mode === "string" ? mode : "task" } }));
export const openShortcuts = () => window.dispatchEvent(new Event(SHORTCUTS_EVENT));
