import { useMoneyFormat } from "../../../lib/profile";

export const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:ring-blue-500/20";
export const buttonPrimary = "inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50";
export const buttonSecondary = "inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10";
export const buttonGhost = "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5";

export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

export function MoneyInput({ value, onChange, ...props }) {
  const money = useMoneyFormat();
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{money.symbol}</span>
      <input type="number" inputMode="decimal" step="0.01" min="0" value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} pl-8`} {...props} />
    </div>
  );
}

export function Card({ title, action, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0f1733] ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>}
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
    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-white/10">
      {Icon && <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"><Icon className="h-5 w-5" /></span>}
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{children}</p>}
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
        <circle cx="21" cy="21" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100 dark:text-white/10" />
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
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{centerLabel}</span>
        <span className="text-sm font-extrabold text-slate-900 dark:text-white">{centerValue}</span>
      </div>
    </div>
  );
}

export function Amount({ value, kind, className = "" }) {
  const money = useMoneyFormat();
  const tone = kind === "income" ? "text-emerald-600 dark:text-emerald-400" : kind === "expense" ? "text-slate-900 dark:text-slate-100" : "text-blue-600 dark:text-blue-300";
  const sign = kind === "income" ? "+" : kind === "expense" ? "−" : "";
  return <span className={`font-bold tabular-nums ${tone} ${className}`}>{sign}{money(value)}</span>;
}
