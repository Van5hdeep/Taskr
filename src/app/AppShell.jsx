import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { Toaster } from "sonner";
import {
  ChevronsLeft, ChevronsRight, ChevronUp, GitMerge, Lifebuoy, LogOut, Menu, PenTool, PieChart,
  Plus, Search, Settings, StickyNote, UserRound, X, LayoutGrid,
} from "../lib/icons";
import { useAuth } from "../lib/auth/AuthProvider";
import { useAppTheme, useTheme } from "../lib/theme";
import { useConfirm } from "../components/ui/ConfirmDialog";
import BrandLogo, { QuadMark } from "../components/BrandLogo";
import GlobalOverlays from "./GlobalOverlays";
import { openCommandPalette, openQuickCapture } from "./globalEvents";

export const NAV_ITEMS = [
  { to: "/home", label: "Home", icon: LayoutGrid },
  { to: "/sticker", label: "Sticker", icon: StickyNote },
  { to: "/finance", label: "Finance", icon: PieChart },
  { to: "/workspace", label: "Workspace", icon: PenTool },
  { to: "/flow", label: "Flow", icon: GitMerge },
];

const NAV_GROUPS = [
  { label: "Main", items: NAV_ITEMS.slice(0, 1) },
  { label: "Tools", items: NAV_ITEMS.slice(1) },
  { label: "Support", items: [{ to: "/help", label: "Help & support", icon: Lifebuoy }] },
  { label: "Account", items: [{ to: "/settings", label: "Settings", icon: Settings }] },
];

const COLLAPSE_KEY = "taskr_sidebar_collapsed";
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

function UserMenu({ collapsed, onNavigate }) {
  const { email, isGuest, displayName, signOut } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    const message = isGuest
      ? "You're using a guest account. Signing out loses access to its work unless you add an email in Settings first."
      : "Are you sure you want to log out of taskr?";
    if (!(await confirm({ title: "Log out?", message, confirmText: "Log out", destructive: isGuest }))) return;
    await signOut();
    navigate("/", { replace: true });
  };

  const initials = isGuest ? null : (displayName || "U").slice(0, 2).toUpperCase();
  const go = (to) => { setOpen(false); onNavigate?.(); navigate(to); };

  return (
    <div ref={ref} className="relative">
      {open && (
        <div className="absolute bottom-full left-0 right-0 z-30 mb-2 min-w-48 rounded-2xl border border-stone-200 bg-white p-1.5 text-sm shadow-xl dark:border-white/10 dark:bg-ink-850">
          <button type="button" onClick={() => go("/settings")} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-white/5"><UserRound className="h-4 w-4" /> Profile & settings</button>
          <button type="button" onClick={handleSignOut} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"><LogOut className="h-4 w-4" /> Log out</button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        title={collapsed ? (isGuest ? "Guest" : displayName) : undefined}
        className={`flex w-full items-center gap-2.5 rounded-2xl border border-stone-200/80 bg-white p-2 text-left shadow-sm transition-colors hover:border-stone-300 dark:border-white/[0.07] dark:bg-ink-850 dark:hover:border-white/15 ${collapsed ? "justify-center" : ""}`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-xs font-bold text-stone-900">
          {initials ?? <UserRound className="h-4 w-4" />}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-stone-900 dark:text-stone-100">{isGuest ? "Guest" : displayName}</span>
              <span className="block truncate text-xs text-stone-500 dark:text-stone-400">{email || "Not saved yet"}</span>
            </span>
            <ChevronUp className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${open ? "" : "rotate-180"}`} />
          </>
        )}
      </button>
    </div>
  );
}

function SidebarContent({ collapsed, onNavigate }) {
  const { isGuest } = useAuth();

  const linkClass = ({ isActive }) =>
    `group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${collapsed ? "justify-center" : ""} ${
      isActive
        ? "bg-white text-stone-900 shadow-[0_1px_2px_rgba(28,27,25,0.06),0_4px_12px_-4px_rgba(28,27,25,0.1)] dark:bg-white/[0.08] dark:text-white dark:shadow-none"
        : "text-stone-600 hover:bg-white/60 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-white/[0.04] dark:hover:text-stone-100"
    }`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        onClick={() => { onNavigate?.(); openCommandPalette(); }}
        title="Search and commands"
        className={`mb-2 flex items-center gap-2.5 rounded-xl border border-stone-200/80 bg-white/70 px-3 py-2 text-sm text-stone-400 transition-colors hover:border-stone-300 hover:text-stone-600 dark:border-white/[0.07] dark:bg-white/[0.03] dark:hover:border-white/15 dark:hover:text-stone-300 ${collapsed ? "justify-center" : ""}`}
      >
        <Search className="h-4 w-4 shrink-0" />
        {!collapsed && <><span className="flex-1 text-left">Search…</span><kbd className="rounded-md border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-stone-500 dark:border-white/10 dark:bg-white/5 dark:text-stone-400">{isMac ? "⌘K" : "Ctrl K"}</kbd></>}
      </button>
      <button
        type="button"
        onClick={() => { onNavigate?.(); openQuickCapture("task"); }}
        title="Quick add (Alt+N)"
        className={`mb-4 flex items-center gap-2 rounded-xl bg-stone-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-800 dark:bg-amber-400 dark:text-stone-900 dark:hover:bg-amber-300 ${collapsed ? "justify-center" : ""}`}
      >
        <Plus className="h-4 w-4 shrink-0" strokeWidth={3} />{!collapsed && "Quick add"}
      </button>

      <nav className="-mx-1 flex-1 space-y-5 overflow-y-auto px-1" aria-label="Main">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400 dark:text-stone-500">{group.label}</p>}
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={linkClass} onClick={onNavigate} title={collapsed ? label : undefined}>
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-2 pt-3">
        {isGuest && !collapsed && (
          <NavLink to="/settings/account" onClick={onNavigate} className="block rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
            Guest account — add an email to keep your work.
          </NavLink>
        )}
        <UserMenu collapsed={collapsed} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

export default function AppShell() {
  const theme = useAppTheme();
  const { dark } = theme;
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

  const sidebarSurface = "bg-cream-100 dark:bg-ink-900";

  return (
    <div className={`flex min-h-screen ${t.shell}`}>
      <Toaster position="top-right" theme={dark ? "dark" : "light"} richColors closeButton />
      <GlobalOverlays />

      {/* Desktop sidebar */}
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-stone-200/70 p-3 transition-[width] duration-200 print:!hidden lg:flex dark:border-white/[0.06] ${sidebarSurface} ${collapsed ? "w-[76px]" : "w-64"}`}>
        <div className={`mb-5 flex items-center pt-2 ${collapsed ? "flex-col gap-3" : "justify-between px-2"}`}>
          {collapsed ? <QuadMark className="h-6 w-6 text-stone-900 dark:text-amber-400" title="taskr" /> : <BrandLogo size={24} markClassName="text-stone-900 dark:text-amber-400" wordClassName="text-stone-900 dark:text-white" />}
          <button type="button" onClick={toggleCollapsed} className="rounded-lg p-1.5 text-stone-400 hover:bg-white/70 hover:text-stone-700 dark:hover:bg-white/5 dark:hover:text-stone-200" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile top bar + drawer */}
      <div className={`fixed inset-x-0 top-0 z-[110] flex h-14 items-center justify-between border-b border-stone-200/70 px-4 print:hidden lg:hidden dark:border-white/[0.06] ${sidebarSurface}`}>
        <BrandLogo size={22} markClassName="text-stone-900 dark:text-amber-400" wordClassName="text-stone-900 dark:text-white" />
        <button type="button" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-stone-600 dark:text-stone-300" aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </button>
      </div>
      <div className={`fixed inset-0 z-[120] bg-stone-900/30 backdrop-blur-[2px] transition-opacity lg:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setMobileOpen(false)} />
      <aside className={`fixed left-0 top-0 z-[130] flex h-full w-[284px] flex-col p-4 transition-transform duration-300 lg:hidden ${sidebarSurface} ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`} aria-hidden={!mobileOpen}>
        <div className="mb-6 flex items-center justify-between">
          <BrandLogo size={22} markClassName="text-stone-900 dark:text-amber-400" wordClassName="text-stone-900 dark:text-white" />
          <button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-stone-500" aria-label="Close navigation"><X className="h-4 w-4" /></button>
        </div>
        <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div className="taskr-page-enter flex min-w-0 flex-1 flex-col pt-14 lg:pt-0 print:pt-0">
        <Outlet context={{ t, dark, theme }} />
      </div>
    </div>
  );
}
