import { useState } from "react";
import GlobalOverlays from "./GlobalOverlays";
import { openCommandPalette, openQuickCapture } from "./globalEvents";
import { AuthSuccess } from "../features/auth/AuthLayout";
import FullScreenLoader from "../components/ui/FullScreenLoader";

/** Development-only: overlays and transitions without signing in (data calls fail harmlessly). */
export default function DevOverlaysPlayground() {
  const [preview, setPreview] = useState(null); // "success" | "loader"
  return (
    <div className="p-8">
      <p className="mb-4 rounded bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900">Dev playground — overlays only, not signed in</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={openCommandPalette} className="rounded-lg border px-3 py-2 text-sm">Open palette</button>
        <button type="button" onClick={() => openQuickCapture("expense")} className="rounded-lg border px-3 py-2 text-sm">Quick add expense</button>
        <button type="button" onClick={() => setPreview("success")} className="rounded-lg border px-3 py-2 text-sm">Sign-in success</button>
        <button type="button" onClick={() => setPreview("loader")} className="rounded-lg border px-3 py-2 text-sm">Loading screen</button>
      </div>
      {preview === "success" && <AuthSuccess title="Welcome back, Vansh" hold={6000} onDone={() => setPreview(null)} />}
      {preview === "loader" && <div className="fixed inset-0 z-50" onClick={() => setPreview(null)}><FullScreenLoader label="Loading your space…" /></div>}
      <GlobalOverlays />
    </div>
  );
}
