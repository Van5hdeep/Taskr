import { Moon, Sun, Zap } from "lucide-react";

interface HeaderProps {
  darkMode: boolean;
  userName?: string;
  onToggleDarkMode: () => void;
  onSignOut?: () => void;
}

export function Header({ darkMode, userName = "Guest", onToggleDarkMode, onSignOut }: HeaderProps) {
  const initials = userName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            darkMode
              ? "bg-electric/20 text-electric-glow"
              : "bg-electric/10 text-electric"
          }`}
        >
          <Zap className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div>
          <p
            className={`text-xs font-medium uppercase tracking-widest ${
              darkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Task-tracker
          </p>
          <h1
            className={`text-lg font-bold tracking-tight sm:text-xl ${
              darkMode ? "text-white" : "text-slate-900"
            }`}
          >
            Last-Minute Life Saver
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleDarkMode}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
            darkMode
              ? "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          {darkMode ? (
            <Sun className="h-4.5 w-4.5" />
          ) : (
            <Moon className="h-4.5 w-4.5" />
          )}
        </button>

        <button
          type="button"
          onClick={onSignOut}
          aria-label="User profile"
          className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors sm:px-3 ${
            darkMode
              ? "bg-slate-800 hover:bg-slate-700"
              : "bg-white shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-electric to-electric-light text-xs font-bold text-white">
            {initials}
          </div>
          <span
            className={`hidden text-sm font-medium sm:inline ${
              darkMode ? "text-slate-200" : "text-slate-700"
            }`}
          >
            {userName}
          </span>
        </button>
      </div>
    </header>
  );
}
