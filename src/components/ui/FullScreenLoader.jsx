import { QuadMark } from "../BrandLogo";

/** Full-page wait state: the Quad tiles pulse one after another. */
export default function FullScreenLoader({ label = "Starting…" }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream-50 text-stone-500 dark:bg-ink-950 dark:text-stone-400" role="status">
      <QuadMark className="quad-loading h-12 w-12 text-stone-900 dark:text-amber-400" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
