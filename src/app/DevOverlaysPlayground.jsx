import GlobalOverlays from "./GlobalOverlays";
import { openCommandPalette, openQuickCapture } from "./globalEvents";

/** Development-only: command palette, quick capture and shortcuts without signing in (data calls fail harmlessly). */
export default function DevOverlaysPlayground() {
  return (
    <div className="p-8">
      <p className="mb-4 rounded bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900">Dev playground — overlays only, not signed in</p>
      <div className="flex gap-2">
        <button type="button" onClick={openCommandPalette} className="rounded-lg border px-3 py-2 text-sm">Open palette</button>
        <button type="button" onClick={() => openQuickCapture("expense")} className="rounded-lg border px-3 py-2 text-sm">Quick add expense</button>
      </div>
      <GlobalOverlays />
    </div>
  );
}
