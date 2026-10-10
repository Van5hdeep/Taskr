import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const ConfirmContext = createContext(null);

/**
 * App-wide confirmation dialog (replaces window.confirm).
 * usage: const confirm = useConfirm(); if (await confirm({ message, destructive: true })) { ... }
 */
export function ConfirmProvider({ children }) {
  const [config, setConfig] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolverRef.current = resolve;
    setConfig(typeof options === "string" ? { message: options } : options);
  }), []);

  const close = useCallback((result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setConfig(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {config && <ConfirmDialog config={config} onClose={close} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return confirm;
}

function ConfirmDialog({ config, onClose }) {
  const confirmRef = useRef(null);
  const { title = "Are you sure?", message, confirmText, cancelText = "Cancel", destructive = false, alertOnly = false } = config;

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (event) => { if (event.key === "Escape") onClose(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" role="presentation" onClick={() => onClose(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl dark:border-blue-500/30 dark:bg-[#161f42] dark:text-slate-200"
      >
        <h3 id="confirm-title" className="mb-2 text-lg font-bold">{title}</h3>
        {message && <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{message}</p>}
        <div className="flex justify-end gap-3">
          {!alertOnly && (
            <button type="button" onClick={() => onClose(false)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-500/10 dark:text-slate-300">
              {cancelText}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onClose(true)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors ${destructive ? "bg-red-500 shadow-red-500/20 hover:bg-red-600" : "bg-blue-500 shadow-blue-500/20 hover:bg-blue-600"}`}
          >
            {confirmText || (destructive ? "Delete" : "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
