import { CalendarClock, Loader2, Send, Sparkles } from "lucide-react";
import { useState } from "react";

interface PanicDumpProps {
  darkMode: boolean;
  isSubmitting?: boolean;
  onSubmit: (text: string, deadline: string) => Promise<void> | void;
}

export function PanicDump({ darkMode, isSubmitting = false, onSubmit }: PanicDumpProps) {
  const [text, setText] = useState("");
  const [deadline, setDeadline] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;
    try {
      await onSubmit(text.trim(), deadline);
      setText("");
      setDeadline("");
    } catch {
      // Keep form values on failure so the user can retry.
    }
  };

  const inputBase = darkMode
    ? "bg-slate-800/80 text-white placeholder:text-slate-500 ring-white/10 focus:ring-electric/50"
    : "bg-white/80 text-slate-900 placeholder:text-slate-400 ring-slate-200 focus:ring-electric/40";

  const cardBase = darkMode
    ? "glass-card-dark bg-slate-900/70"
    : "glass-card bg-white/70";

  return (
    <section
      className={`flex flex-col rounded-2xl p-5 sm:p-6 ${cardBase}`}
      aria-labelledby="panic-dump-heading"
    >
      <div className="mb-5 flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            darkMode ? "bg-crimson/20 text-crimson-light" : "bg-crimson/10 text-crimson"
          }`}
        >
          <Sparkles className="h-4.5 w-4.5" />
        </div>
        <div>
          <h2
            id="panic-dump-heading"
            className={`text-base font-semibold sm:text-lg ${
              darkMode ? "text-white" : "text-slate-900"
            }`}
          >
            The Panic Dump
          </h2>
          <p
            className={`mt-0.5 text-sm ${
              darkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Brain-dump everything. We&apos;ll sort the chaos.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
        <div>
          <label
            htmlFor="panic-input"
            className={`mb-1.5 block text-xs font-medium uppercase tracking-wide ${
              darkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Chaotic tasks
          </label>
          <textarea
            id="panic-input"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. finish report, email prof, buy groceries, fix bug before demo..."
            className={`w-full resize-none rounded-xl px-4 py-3 text-sm ring-1 transition-shadow outline-none focus:ring-2 ${inputBase}`}
          />
        </div>

        <div>
          <label
            htmlFor="deadline-input"
            className={`mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide ${
              darkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            <CalendarClock className="h-3.5 w-3.5" />
            Deadlines
          </label>
          <input
            id="deadline-input"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={`w-full rounded-xl px-4 py-2.5 text-sm ring-1 transition-shadow outline-none focus:ring-2 ${inputBase}`}
          />
        </div>

        <button
          type="submit"
          disabled={!text.trim() || isSubmitting}
          className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-electric to-electric-light px-4 py-3 text-sm font-semibold text-white shadow-md shadow-electric/25 transition-all hover:shadow-lg hover:shadow-electric/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {isSubmitting ? "Prioritizing…" : "Dump & Prioritize"}
        </button>
      </form>
    </section>
  );
}
