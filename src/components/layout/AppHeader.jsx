import { ChevronDown, LogOut, Menu } from "lucide-react";

export default function AppHeader({ 
  email, 
  fullName, 
  t, 
  dark,
  onSignOut, 
  onMenuClick, 
  title 
}) {
  const initials = (fullName || email || "U")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="px-2 pt-2 sm:px-4 sm:pt-4 w-full">
      <header className={`mx-auto max-w-7xl rounded-b-[2.5rem] border shadow-sm ${dark ? "border-blue-500/20 bg-[#0a0f24]" : "border-slate-200 bg-white"}`}>
        <div className="flex h-16 items-center justify-between px-6 sm:px-8">
          <div className="flex items-center gap-4">
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
          
          <div className="relative group py-2">
            <button type="button" className={`flex items-center gap-2.5 rounded-full border px-3 py-1.5 shadow-sm transition-colors hover:border-blue-500/30 ${t.profileBtn}`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {initials}
              </div>
              <span className={`hidden max-w-[140px] truncate text-sm font-medium sm:inline ${t.textPrimary}`}>
                {email}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-hover:rotate-180" />
            </button>
            
            <div className="absolute right-0 top-full z-50 hidden w-64 pt-1 group-hover:block">
              <div className="h-2" />
              <div className={`overflow-hidden rounded-2xl border shadow-xl ${t.dropdown}`}>
                <div className={`border-b px-4 py-3 ${dark ? "border-blue-500/20" : "border-zinc-100"}`}>
                  <p className={`text-xs font-semibold uppercase ${t.textMuted}`}>Signed in as</p>
                  <p className={`mt-1 truncate text-sm font-medium ${t.textPrimary}`}>{email}</p>
                </div>
                <div className="p-2">
                  <button
                    type="button"
                    onClick={onSignOut}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${dark ? "bg-[#0d1530] text-slate-200 hover:bg-red-950/50 hover:text-red-400" : "bg-zinc-50 text-zinc-700 hover:bg-red-50 hover:text-red-600"}`}
                  >
                    <LogOut className="h-4 w-4" /> Log Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
