import { AlertTriangle, Check, CloudOff, Loader2 } from "lucide-react";

/** Autosave state label shared by the Workspace and Flow editors. */
export default function SaveStatus({ status }) {
  const map = {
    saved: { icon: Check, text: "Saved", tone: "text-emerald-600" },
    pending: { icon: Loader2, text: "Unsaved changes", tone: "text-slate-500", spin: false },
    saving: { icon: Loader2, text: "Saving…", tone: "text-slate-500", spin: true },
    offline: { icon: CloudOff, text: "Offline — will retry", tone: "text-amber-600" },
    error: { icon: AlertTriangle, text: "Couldn't save — retrying", tone: "text-red-600" },
    conflict: { icon: AlertTriangle, text: "Changed elsewhere", tone: "text-red-600" },
  };
  const { icon: Icon, text, tone, spin } = map[status] ?? map.saved;
  return <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${tone}`} role="status"><Icon className={`h-3.5 w-3.5 ${spin ? "animate-spin" : ""}`} />{text}</span>;
}
