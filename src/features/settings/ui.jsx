export const inputClass = "w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:opacity-60 dark:border-white/10 dark:bg-ink-850 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:ring-amber-500/25";
export const buttonPrimary = "inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 dark:bg-amber-400 dark:text-stone-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-stone-800 dark:hover:bg-amber-300 disabled:opacity-50";
export const buttonSecondary = "inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-stone-200 dark:hover:bg-white/10";
export const buttonDanger = "inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50";

/** A titled block inside a settings page. */
export function Panel({ title, description, children, tone = "default" }) {
  const border = tone === "danger" ? "border-red-200 dark:border-red-500/25" : "border-stone-200 dark:border-white/[0.07]";
  return (
    <section className={`rounded-2xl border bg-white p-6 dark:bg-ink-900 ${border}`}>
      {(title || description) && (
        <header className="mb-5">
          {title && <h2 className={`font-bold ${tone === "danger" ? "text-red-700 dark:text-red-400" : "text-stone-900 dark:text-white"}`}>{title}</h2>}
          {description && <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-stone-600 dark:text-stone-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-400">{hint}</span>}
    </label>
  );
}

/** Label/value row for read-only facts. */
export function Fact({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone-100 py-3 text-sm last:border-0 dark:border-white/[0.06]">
      <span className="text-stone-500 dark:text-stone-400">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-stone-900 dark:text-stone-100">{children}</span>
    </div>
  );
}
