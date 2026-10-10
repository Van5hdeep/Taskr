import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import Modal from "../components/ui/Modal";
import { CAPTURE_EVENT, PALETTE_EVENT, SHORTCUTS_EVENT } from "./globalEvents";

const CommandPalette = lazy(() => import("./CommandPalette"));
const QuickCapture = lazy(() => import("../features/capture/QuickCapture"));

const isTyping = (element) => element && (["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName) || element.isContentEditable);
const MOD = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";

const GO_KEYS = { h: "/home", s: "/sticker", f: "/finance", w: "/workspace", l: "/flow", ",": "/settings" };

const SHORTCUTS = [
  { group: "Everywhere", items: [[`${MOD} K`, "Search and commands"], ["Alt N", "Quick add (task, expense, income)"], ["?", "This list"], ["G then H / S / F / W / L", "Go to Home, Sticker, Finance, Workspace, Flow"], ["G then ,", "Settings"]] },
  { group: "Sticker", items: [["Enter", "Add the captured task"], ["!  *  #tag", "Urgent, important, tag (in capture)"], ["D T W L K", "Daily review: done, tomorrow, next week, later, keep"]] },
  { group: "Workspace", items: [["V T N R", "Select, text, note, shape"], ["P H E", "Pen, highlighter, eraser"], [`${MOD} Z / ${MOD} Y`, "Undo / redo"], [`${MOD} D`, "Duplicate"], [`${MOD} ] / ${MOD} [`, "Bring forward / send back"], ["Arrows (Shift)", "Nudge 1px (10px)"], ["Alt while dragging", "Turn off snapping"]] },
  { group: "Flow", items: [["Drag from a dot", "Connect blocks"], ["Double-click", "Rename a block"], ["Shift + drag", "Select several"], [`${MOD} C / V / D`, "Copy, paste, duplicate"], ["Delete", "Remove selection"]] },
];

function ShortcutSheet({ onClose }) {
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose} size="lg">
      <div className="grid gap-6 sm:grid-cols-2">
        {SHORTCUTS.map((section) => (
          <section key={section.group}>
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{section.group}</h3>
            <dl className="space-y-1.5">
              {section.items.map(([keys, label]) => (
                <div key={label} className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-slate-600 dark:text-slate-300">{label}</dt>
                  <dd><kbd className="whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">{keys}</kbd></dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  );
}

/** Command palette, quick capture and shortcut sheet, plus their global hotkeys. */
export default function GlobalOverlays() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(null); // { kind: "palette" | "capture" | "shortcuts", mode? }
  const goPending = useRef(0);

  useEffect(() => {
    const onPalette = () => setOpen({ kind: "palette" });
    const onCapture = (event) => setOpen({ kind: "capture", mode: event.detail?.mode ?? "task" });
    const onShortcuts = () => setOpen({ kind: "shortcuts" });
    window.addEventListener(PALETTE_EVENT, onPalette);
    window.addEventListener(CAPTURE_EVENT, onCapture);
    window.addEventListener(SHORTCUTS_EVENT, onShortcuts);
    return () => {
      window.removeEventListener(PALETTE_EVENT, onPalette);
      window.removeEventListener(CAPTURE_EVENT, onCapture);
      window.removeEventListener(SHORTCUTS_EVENT, onShortcuts);
    };
  }, []);

  // Capture phase so tool-level shortcuts (e.g. Workspace "h") don't also fire.
  useEffect(() => {
    const onKey = (event) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && !event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        event.stopPropagation();
        setOpen((current) => (current?.kind === "palette" ? null : { kind: "palette" }));
        return;
      }
      if (event.altKey && !mod && event.code === "KeyN") {
        event.preventDefault();
        event.stopPropagation();
        setOpen({ kind: "capture", mode: "task" });
        return;
      }
      if (open || mod || event.altKey || isTyping(document.activeElement)) return;
      if (event.key === "?") { event.preventDefault(); setOpen({ kind: "shortcuts" }); return; }
      const key = event.key.toLowerCase();
      if (Date.now() - goPending.current < 1200 && GO_KEYS[key]) {
        event.preventDefault();
        event.stopPropagation();
        goPending.current = 0;
        navigate(GO_KEYS[key]);
        return;
      }
      goPending.current = key === "g" ? Date.now() : 0;
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [navigate, open]);

  const close = () => setOpen(null);
  return (
    <Suspense fallback={null}>
      {open?.kind === "palette" && <CommandPalette onClose={close} />}
      {open?.kind === "capture" && <QuickCapture initialMode={open.mode} onClose={close} />}
      {open?.kind === "shortcuts" && <ShortcutSheet onClose={close} />}
    </Suspense>
  );
}
