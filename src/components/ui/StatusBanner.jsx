import { AlertCircle, CheckCircle2, X } from "lucide-react";

export default function StatusBanner({ message, variant = "error", onDismiss, className = "" }) {
  if (!message) return null;
  const palette = variant === "success"
    ? "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300"
    : variant === "info"
      ? "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-300"
      : "border-red-100 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-300";
  const Icon = variant === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div role={variant === "error" ? "alert" : "status"} className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 ${palette} ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1 text-sm font-medium">{message}</p>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss">
          <X className="h-4 w-4 opacity-60 hover:opacity-100" />
        </button>
      )}
    </div>
  );
}
