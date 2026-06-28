import type { UrgencyLevel } from "../types/task";

const urgencyStyles: Record<
  UrgencyLevel,
  { light: string; dark: string; dot: string }
> = {
  Immediate: {
    light: "bg-crimson/10 text-crimson ring-crimson/20",
    dark: "bg-crimson/20 text-crimson-light ring-crimson/30",
    dot: "bg-crimson",
  },
  High: {
    light: "bg-orange-500/10 text-orange-600 ring-orange-500/20",
    dark: "bg-orange-500/20 text-orange-400 ring-orange-500/30",
    dot: "bg-orange-500",
  },
  Medium: {
    light: "bg-amber-500/10 text-amber-600 ring-amber-500/20",
    dark: "bg-amber-500/20 text-amber-400 ring-amber-500/30",
    dot: "bg-amber-500",
  },
  Low: {
    light: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
    dark: "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30",
    dot: "bg-emerald-500",
  },
};

interface UrgencyTagProps {
  level: UrgencyLevel;
  darkMode: boolean;
}

export function UrgencyTag({ level, darkMode }: UrgencyTagProps) {
  const styles = urgencyStyles[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
        darkMode ? styles.dark : styles.light
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {level}
    </span>
  );
}
