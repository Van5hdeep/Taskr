import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/** Accessible centred dialog. Escape and backdrop click close it. */
export default function Modal({ title, description, onClose, children, footer, size = "md" }) {
  const panelRef = useRef(null);
  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-5xl" };

  useEffect(() => {
    const previous = document.activeElement;
    const first = panelRef.current?.querySelector("input, select, textarea, button:not([data-close])");
    first?.focus();
    // Capture phase + stopPropagation: Escape closes only this modal, not the
    // panel or editor underneath that also listens for Escape.
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      previous?.focus?.();
    };
  }, [onClose]);

  // Portal: a modal opened from inside a form (e.g. the task editor) must not
  // submit that form or inherit its layout.
  return createPortal(
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
        className={`flex max-h-[90vh] w-full ${widths[size]} flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0e1532]`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          <button type="button" data-close onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5" aria-label="Close"><X className="h-4 w-4" /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-slate-100 px-6 py-3 dark:border-white/10">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}
