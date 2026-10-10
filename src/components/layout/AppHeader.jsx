import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Menu } from "lucide-react";
import BrandLogo from "../BrandLogo";

export default function AppHeader({
  email,
  fullName,
  t,
  dark,
  onSignOut,
  onMenuClick,
  title,
  showAccount = false
}) {
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const initials = (fullName || email || "U")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    const handleOutsidePointer = (event) => {
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false);
    };
    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, []);

  return (
    <div className="w-full px-4 pt-4 sm:px-6 sm:pt-6">
      <header className={`mx-auto max-w-7xl rounded-2xl border backdrop-blur-sm ${dark ? "border-slate-700/80 bg-[#0d1430]/95 shadow-[0_10px_30px_rgba(0,0,0,0.24)]" : "border-slate-200/90 bg-white/95 shadow-[0_10px_30px_rgba(15,23,42,0.06)]"}`}>
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <BrandLogo className="app-wordmark" tone="dark" />
            <button
              type="button"
              onClick={onMenuClick}
              className={`inline-flex items-center rounded-lg p-2 transition-colors border shadow-sm ${dark ? "border-blue-500/30 bg-[#161f42] text-blue-300 hover:text-blue-200" : "border-slate-200 bg-white text-slate-500 hover:text-blue-500"}`}
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className={`text-lg font-bold tracking-wide uppercase ${t.textPrimary}`}>
              {title}
            </h1>
          </div>

          {showAccount && (
            <div ref={accountRef} className="relative py-2">
              <button type="button" aria-expanded={accountOpen} onClick={() => setAccountOpen((open) => !open)} className={`flex items-center gap-2.5 rounded-full border px-3 py-1.5 shadow-sm transition-colors hover:border-blue-500/30 ${t.profileBtn}`}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {initials}
                </div>
                <span className={`hidden max-w-[140px] truncate text-sm font-medium sm:inline ${t.textPrimary}`}>
                  {email}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${accountOpen ? "rotate-180" : ""}`} />
              </button>

              <div
                className={`absolute right-0 top-full z-50 w-64 pt-1 ${accountOpen ? "block" : "hidden"}`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <div className={`overflow-hidden rounded-2xl border shadow-xl ${t.dropdown}`}>
                  <div className={`border-b px-4 py-3 ${dark ? "border-blue-500/20" : "border-zinc-100"}`}>
                    <p className={`text-xs font-semibold uppercase ${t.textMuted}`}>Signed in as</p>
                    <p className={`mt-1 truncate text-sm font-medium ${t.textPrimary}`}>{email}</p>
                  </div>
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setAccountOpen(false);
                        onSignOut?.();
                      }}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${dark ? "bg-[#0d1530] text-slate-200 hover:bg-red-950/50 hover:text-red-400" : "bg-zinc-50 text-zinc-700 hover:bg-red-50 hover:text-red-600"}`}
                    >
                      <LogOut className="h-4 w-4" /> Log Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}
