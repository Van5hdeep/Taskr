import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { Toaster } from "sonner";
import {
  ChevronsLeft, ChevronsRight, GitMerge, LayoutGrid, LogOut, Menu, Monitor, Moon,
  PenTool, PieChart, Settings, StickyNote, Sun, UserRound, X,
} from "lucide-react";
import { useAuth } from "../lib/auth/AuthProvider";
import { useAppTheme, useTheme } from "../lib/theme";
import { useConfirm } from "../components/ui/ConfirmDialog";
import BrandLogo from "../components/BrandLogo";

export const NAV_ITEMS = [
  { to: "/home", label: "Home", icon: LayoutGrid },
  { to: "/sticker", label: "Sticker", icon: StickyNote },
  { to: "/finance", label: "Finance", icon: PieChart },
  { to: "/workspace", label: "Workspace", icon: PenTool },
  { to: "/flow", label: "Flow", icon: GitMerge },
];

const THEME_OPTIONS = [
  { id: "light", icon: Sun, label: "Light" },
  { id: "dark", icon: Moon, label: "Dark" },
  { id: "system", icon: Monitor, label: "System" },
];

const COLLAPSE_KEY = "taskr_sidebar_collapsed";

function SidebarContent({ collapsed, onNavigate, themePreference, onThemeChange }) {
  const { email, isGuest, displayName, signOut } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const message = isGuest
      ? "You're using a guest account. Signing out loses access to its work unless you add an email in Settings first."
      : "Are you sure you want to log out of TASKR?";
    if (!(await confirm({ title: "Log out?", message, confirmText: "Log out", destructive: isGuest }))) return;
    await signOut();
    navigate("/", { replace: true });
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${collapsed ? "justify-center" : ""} ${
      isActive
        ? "bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
    }`;

  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 space-y-1" aria-label="Main">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass} onClick={onNavigate} title={collapsed ? label : undefined}>
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-white/10">
        {isGuest && !collapsed && (
          <NavLink to="/settings" onClick={onNavigate} className="block rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300">
            Guest account — add an email to keep your work.
          </NavLink>
        )}
        <div className={`flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/5 ${collapsed ? "flex-col" : ""}`} role="radiogroup" aria-label="Theme">
          {THEME_OPTIONS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={themePreference === id}
              title={label}
              onClick={() => onThemeChange(id)}
              className={`flex flex-1 items-center justify-center rounded-lg py-1.5 transition-colors ${themePreference === id ? "bg-white text-blue-600 shadow-sm dark:bg-[#1c2650] dark:text-blue-300" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <NavLink to="/settings" className={linkClass} onClick={onNavigate} title={collapsed ? "Settings" : undefined}>
          <Settings className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && "Settings"}
        </NavLink>
        <div className={`flex items-center gap-2 rounded-xl px-2 py-2 ${collapsed ? "flex-col" : ""}`}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            {isGuest ? <UserRound className="h-4 w-4" /> : (displayName || "U").slice(0, 2).toUpperCase()}
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{isGuest ? "Guest" : displayName}</span>
              {email && <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{email}</span>}
            </span>
          )}
          <button type="button" onClick={handleSignOut} title="Log out" aria-label="Log out" className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const theme = useAppTheme();
  const { dark, preference, setPreference } = theme;
  const t = useTheme(dark);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; }
  });

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      try { localStorage.setItem(COLLAPSE_KEY, value ? "0" : "1"); } catch { /* preference stays in memory */ }
      return !value;
    });
  };

  const sidebarSurface = "border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1129]";

  return (
    <div className={`flex min-h-screen ${t.shell}`}>
      <Toaster position="top-right" theme={dark ? "dark" : "light"} richColors closeButton />

      {/* Desktop sidebar */}
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r p-3 transition-[width] duration-200 lg:flex ${sidebarSurface} ${collapsed ? "w-[72px]" : "w-60"}`}>
        <div className={`mb-5 flex items-center ${collapsed ? "justify-center" : "justify-between px-2"} pt-1`}>
          {!collapsed && <BrandLogo className="app-wordmark" tone="dark" />}
          <button type="button" onClick={toggleCollapsed} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-slate-200" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>
        <SidebarContent collapsed={collapsed} themePreference={preference} onThemeChange={setPreference} />
      </aside>

      {/* Mobile top bar + drawer */}
      <div className={`fixed inset-x-0 top-0 z-[110] flex h-14 items-center justify-between border-b px-4 lg:hidden ${sidebarSurface}`}>
        <BrandLogo className="app-wordmark" tone="dark" />
        <button type="button" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-600 dark:text-slate-300" aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </button>
      </div>
      <div className={`fixed inset-0 z-[120] bg-black/40 transition-opacity lg:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setMobileOpen(false)} />
      <aside className={`fixed left-0 top-0 z-[130] flex h-full w-[280px] flex-col border-r p-4 transition-transform duration-300 lg:hidden ${sidebarSurface} ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`} aria-hidden={!mobileOpen}>
        <div className="mb-6 flex items-center justify-between">
          <BrandLogo className="app-wordmark" tone="dark" />
          <button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-slate-500" aria-label="Close navigation"><X className="h-4 w-4" /></button>
        </div>
        <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} themePreference={preference} onThemeChange={setPreference} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pt-14 lg:pt-0">
        <Outlet context={{ t, dark, theme }} />
      </div>
    </div>
  );
}
