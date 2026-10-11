import { useMoneyFormat } from "../../../lib/profile";

export const inputClass = "w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-stone-100 dark:focus:ring-amber-500/20";
export const buttonPrimary = "inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 dark:bg-amber-400 dark:text-stone-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-stone-800 dark:hover:bg-amber-300 disabled:opacity-50";
export const buttonSecondary = "inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-stone-200 dark:hover:bg-white/10";
export const buttonGhost = "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-white/5";

export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-stone-400">{hint}</span>}
    </label>
  );
}

export function MoneyInput({ value, onChange, ...props }) {
  const money = useMoneyFormat();
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">{money.symbol}</span>
      <input type="number" inputMode="decimal" step="0.01" min="0" value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} pl-8`} {...props} />
    </div>
  );
}

export function Card({ title, action, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-ink-900 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && <h3 className="text-sm font-bold text-stone-900 dark:text-white">{title}</h3>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function ProgressBar({ ratio, tone }) {
  const pct = Math.min(100, Math.max(0, (Number.isFinite(ratio) ? ratio : 1) * 100));
  const color = tone ?? (ratio >= 1 ? "bg-red-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-emerald-500");
  return (
    <div className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-white/10" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 px-6 py-12 text-center dark:border-white/10">
      {Icon && <Icon className="mb-3 h-9 w-9 text-stone-300 dark:text-stone-600" />}
      <h3 className="text-sm font-bold text-stone-900 dark:text-white">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-stone-500 dark:text-stone-400">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Donut chart from [{ id, label, value, color }]. */
export function Donut({ slices, centerLabel, centerValue, size = 168 }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = 15.915; // circumference ≈ 100
  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
        <circle cx="21" cy="21" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-stone-100 dark:text-white/10" />
        {total > 0 && slices.map((slice) => {
          const pct = (slice.value / total) * 100;
          const node = (
            <circle key={slice.id} cx="21" cy="21" r={radius} fill="none" stroke={slice.color} strokeWidth="6" strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={-offset}>
              <title>{`${slice.label}: ${pct.toFixed(1)}%`}</title>
            </circle>
          );
          offset += pct;
          return node;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">{centerLabel}</span>
        <span className="text-sm font-extrabold text-stone-900 dark:text-white">{centerValue}</span>
      </div>
    </div>
  );
}

export function Amount({ value, kind, className = "" }) {
  const money = useMoneyFormat();
  const tone = kind === "income" ? "text-emerald-600 dark:text-emerald-400" : kind === "expense" ? "text-stone-900 dark:text-stone-100" : "text-amber-700 dark:text-amber-300";
  const sign = kind === "income" ? "+" : kind === "expense" ? "−" : "";
  return <span className={`font-bold tabular-nums ${tone} ${className}`}>{sign}{money(value)}</span>;
}
