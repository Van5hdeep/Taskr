import { AlertTriangle, RotateCcw } from "lucide-react";
import { Link, isRouteErrorResponse, useRouteError } from "react-router";

/** Per-route error boundary: one crashing tool never blanks the whole app. */
export default function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error?.message || "Something went wrong.";

  // A redeploy can leave a stale lazy chunk behind; a reload fetches the new one.
  const isChunkError = /dynamically imported module|Importing a module script failed/i.test(message);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-950/40"><AlertTriangle className="h-6 w-6" /></span>
      <h1 className="text-lg font-bold text-slate-900 dark:text-white">This screen hit a problem</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{isChunkError ? "A newer version of TASKR is available." : message}</p>
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"><RotateCcw className="h-4 w-4" /> Reload</button>
        <Link to="/home" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5">Go home</Link>
      </div>
    </div>
  );
}
