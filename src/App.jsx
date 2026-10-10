import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Pencil,
  Save,
  Sparkles,
  Trash2,
  UserPlus,
  X,
  Clock,
  AlertTriangle,
  StickyNote,
  PieChart,
  Table,
  PenTool,
  GitMerge,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import BorderGlow from "./components/BorderGlow/BorderGlow";
import StickerWorkspace from "./components/StickerWorkspace";
import useStickerInteractions from "./hooks/useStickerInteractions";
import { Toaster, toast } from "sonner";
import AppHeader from "./components/layout/AppHeader";
import DashboardHome from "./components/dashboard/DashboardHome";
import BrandLogo from "./components/BrandLogo";
import LandingPage from "./components/landing/LandingPage";


import WorkspaceSaveModal from "./components/WorkspaceSaveModal";
import SaveButton from "./components/ui/SaveButton";
import FinanceWorkspace from "./components/finance/FinanceWorkspace";
import TableWorkspace from "./components/table/TableWorkspace";

const FlowWorkspace = lazy(() => import("./components/flow/FlowWorkspace"));

// ─── Custom Alert Modal ────────────────────────────────────────────────────────

function CustomAlertModal({ config, onClose, dark }) {
  if (!config) return null;
  const isConfirm = config.type === "confirm";

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 ${dark ? "bg-[#161f42]/95 border border-blue-500/30 text-slate-200" : "bg-white border border-slate-200 text-slate-800"}`}>
        <h3 className="mb-2 text-lg font-bold">{config.title || "Alert"}</h3>
        <p className={`mb-6 text-sm leading-relaxed ${dark ? "text-slate-300" : "text-slate-600"}`}>
          {config.message}
        </p>
        <div className="flex justify-end gap-3">
          {isConfirm && (
            <button 
              onClick={() => { config.onCancel && config.onCancel(); onClose(); }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors hover:bg-slate-500/10 ${dark ? "text-slate-300" : "text-slate-600"}`}
            >
              Cancel
            </button>
          )}
          <button 
            onClick={() => { config.onConfirm && config.onConfirm(); onClose(); }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors hover:opacity-90 ${config.isDestructive ? "bg-red-500 text-white shadow-md shadow-red-500/20 hover:bg-red-600" : "bg-blue-500 text-white shadow-md shadow-blue-500/20 hover:bg-blue-600"}`}
          >
            {config.confirmText || "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────

const JUDGE_EMAIL = "judge12@gmail.com";
const JUDGE_PASSWORD = "judge123";

const TASK_META_PREFIX = "tasker_task_meta_";
const STICKER_COLORS = [
  { id: "red", label: "Red", hex: "#ef4444", class: "bg-red-100 text-red-900 border-red-300 dark:bg-red-900/40 dark:text-red-100 dark:border-red-700/50" },
  { id: "yellow", label: "Yellow", hex: "#eab308", class: "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-200 dark:border-yellow-700/50" },
  { id: "blue", label: "Blue", hex: "#2563eb", class: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700/50" },
  { id: "green", label: "Green", hex: "#16a34a", class: "bg-green-100 text-green-900 border-green-300 dark:bg-green-900/40 dark:text-green-200 dark:border-green-700/50" },
  { id: "orange", label: "Orange", hex: "#f97316", class: "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-700/50" },
  { id: "purple", label: "Purple", hex: "#8b5cf6", class: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-700/50" },
  { id: "pink", label: "Pink", hex: "#ec4899", class: "bg-pink-100 text-pink-900 border-pink-300 dark:bg-pink-900/40 dark:text-pink-200 dark:border-pink-700/50" },
  { id: "grey", label: "Grey", hex: "#64748b", class: "bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-900/40 dark:text-slate-200 dark:border-slate-700/50" },
  { id: "white", label: "White", hex: "#f8fafc", class: "bg-white text-zinc-900 border-zinc-200 dark:bg-[#161f42] dark:text-slate-200 dark:border-blue-500/20" },
];

const PRIORITY_FILTERS = [
  { id: "all", label: "All Priorities" },
  { id: "urgent", label: "Urgent", pillClass: "bg-red-50/90 border-red-200/60 text-red-700 dark:bg-red-950/40 dark:border-red-500/30 dark:text-red-300" },
  { id: "important", label: "Important", pillClass: "bg-amber-50/90 border-amber-200/60 text-amber-800 dark:bg-amber-950/35 dark:border-amber-500/25 dark:text-amber-300" },
  { id: "not-important", label: "Not Important", pillClass: "bg-emerald-50/90 border-emerald-200/60 text-emerald-700 dark:bg-emerald-950/35 dark:border-emerald-500/25 dark:text-emerald-300" },
];

const DATE_FILTERS = [
  { id: "all", label: "All Dates" },
  { id: "today", label: "Due Today" },
  { id: "week", label: "Due Within a Week" },
  { id: "month", label: "Due Within a Month" },
];



// ─── Midnight theme tokens ───────────────────────────────────────────────────

function useTheme(dark) {
  return useMemo(
    () => ({
      shell: dark
        ? "bg-[#0a0f24] text-slate-100 paint-fibers-dark"
        : "bg-white text-zinc-900",
      header: dark
        ? "border-blue-500/20 bg-[#0a0f24]"
        : "border-zinc-100 bg-white",
      card: dark
        ? "bg-[#161f42]/80 backdrop-blur-sm border border-blue-500/20 shadow-lg shadow-blue-900/20"
        : "bg-white border border-zinc-100 shadow-sm",
      cardMuted: dark
        ? "bg-[#0d1530]/90 border border-blue-500/15"
        : "bg-zinc-50 border border-zinc-100",
      input: dark
        ? "border-blue-500/20 bg-[#161f42]/60 text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
        : "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100",
      textPrimary: dark ? "text-white" : "text-zinc-900",
      textMuted: dark ? "text-slate-400" : "text-zinc-500",
      dropdown: dark
        ? "border-blue-500/20 bg-[#161f42]/95 shadow-black/50"
        : "border-zinc-100 bg-white shadow-zinc-200/70",
      profileBtn: dark
        ? "border-blue-500/20 bg-[#161f42]/80 hover:border-blue-400/40"
        : "border-zinc-100 bg-white hover:border-blue-200",
      navBtn: dark
        ? "border-blue-500/20 text-slate-300 hover:bg-[#161f42]/80"
        : "border-zinc-100 text-zinc-600 hover:bg-zinc-50",
      authShell: dark ? "bg-[#0a0f24]" : "bg-white",
      authCard: dark
        ? "border-blue-500/20 bg-[#161f42]/80 shadow-black/40"
        : "border-zinc-100 bg-white shadow-zinc-200/50",
      authToggle: dark
        ? "border-blue-500/15 bg-[#0d1530]/90"
        : "border-zinc-100 bg-zinc-50",
    }),
    [dark]
  );
}

// ─── ClickSpark ────────────────────────────────────────────────────────────────

function ClickSpark({
  children,
  sparkColor = "#2563eb",
  sparkCount = 10,
  duration = 400,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const sparksRef = useRef([]);
  const frameRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    const parseHex = (hex) => {
      const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return match
        ? { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) }
        : { r: 37, g: 99, b: 235 };
    };
    const rgb = parseHex(sparkColor);

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const onClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      for (let i = 0; i < sparkCount; i++) {
        const angle = (Math.PI * 2 * i) / sparkCount + Math.random() * 0.4;
        const speed = 1.8 + Math.random() * 3.5;
        sparksRef.current.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: duration,
          maxLife: duration,
        });
      }
    };

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sparksRef.current = sparksRef.current.filter((s) => {
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.04;
        s.life -= 16;
        const alpha = Math.max(0, s.life / s.maxLife);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
        ctx.fill();
        return s.life > 0;
      });
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    container.addEventListener("click", onClick);
    return () => {
      ro.disconnect();
      container.removeEventListener("click", onClick);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [sparkColor, sparkCount, duration]);

  return (
    <div ref={containerRef} className="relative min-h-full">
      {children}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[60]" aria-hidden />
    </div>
  );
}

function formatAuthError(error) {
  const message = String(error?.message || error || "Unable to authenticate.");
  if (/failed to fetch|network|fetch/i.test(message)) {
    return "Cannot reach Supabase. Check that VITE_SUPABASE_URL points to a live Supabase project and restart the dev server.";
  }
  return message;
}

function createTaskTitle(description) {
  const cleaned = String(description || "")
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_\u0060~()]/g, "");
  const words = cleaned.split(/\s+/).filter((word) => word.length > 2);
  if (!words.length) return "Quick Task";

  return words
    .slice(0, 3)
    .map((word, index) => index === 0
      ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      : word.toLowerCase())
    .join(" ");
}

function getStickerClass(colorId) {
  const match = STICKER_COLORS.find(c => c.id === colorId);
  return match ? match.class : STICKER_COLORS[0].class;
}

// ─── Task utilities ────────────────────────────────────────────────────────────

function getFirstName(fullName) {
  if (!fullName || typeof fullName !== "string") return "there";
  return fullName.trim().split(/\s+/)[0];
}

function getUsernameFromEmail(email) {
  if (!email || typeof email !== "string") return "";
  const [name] = email.split("@");
  return name?.trim() ?? "";
}

function dateKey(d) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}

const playNotificationSound = () => {
  try {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav");
    audio.volume = 0.4;
    audio.play();
  } catch (err) {
    console.warn("Audio playback blocked by browser autoplay policy:", err);
  }
};

const formatCountdown = (milliseconds) => {
  if (milliseconds <= 0) return "00:00:00";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map(v => v < 10 ? "0" + v : v)
    .join(":");
};

function normalizeSubTasks(subTasks) {
  const activeSubTasks = Array.isArray(subTasks) ? subTasks : [];
  return activeSubTasks.map((st, index) => {
    if (typeof st === "string") return { id: String(index), label: st, completed: false };
    return { id: String(index), label: st.label || st.text || "", completed: Boolean(st.completed) };
  });
}

function mapSupabaseTask(row, meta = {}) {
  const taskMeta = meta[row.id] ?? {};
  const urgencyScore = row.urgency_score;
  return {
    id: row.id,
    title: row.title || "Untitled Task",
    rawInput: row.raw_input || "",
    deadline: row.deadline ? new Date(row.deadline) : new Date(),
    createdAt: new Date(row.created_at || Date.now()),
    urgencyScore,
    stickerColor: taskMeta.color || "yellow",
    plannedDate: taskMeta.plannedDate ?? dateKey(row.deadline),
    subTasks: normalizeSubTasks(row.sub_tasks),
    isCompleted: row.is_completed,
  };
}

function toDbSubTasks(subTasks) {
  return subTasks.map(({ label, completed }) => ({ label, completed }));
}

function sortByDeadline(taskList) {
  return [...taskList].sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
}

function matchesPriorityFilter(task, priorityFilter) {
  if (priorityFilter === "all") return true;
  if (priorityFilter === "urgent") return task.urgencyScore >= 8;
  if (priorityFilter === "important") return task.urgencyScore >= 5 && task.urgencyScore < 8;
  if (priorityFilter === "not-important") return task.urgencyScore < 5;
  return true;
}

function matchesDateFilter(task, dateFilter) {
  if (dateFilter === "all") return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(task.deadline);
  deadline.setHours(0, 0, 0, 0);
  if (dateFilter === "today") return dateKey(deadline) === dateKey(today);
  if (dateFilter === "week") {
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return deadline >= today && deadline <= weekEnd;
  }
  if (dateFilter === "month") {
    const monthEnd = new Date(today);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    return deadline >= today && deadline <= monthEnd;
  }
  return true;
}

function filterTasks(taskList, priorityFilter, dateFilter) {
  return taskList.filter(
    (task) => matchesPriorityFilter(task, priorityFilter) && matchesDateFilter(task, dateFilter)
  );
}

function toIsoDeadline(deadlineStr) {
  if (!deadlineStr) return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return new Date(deadlineStr).toISOString();
}

function formatDeadline(date) {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── Task Meta (localStorage per-task metadata) ───────────────────────────────

function readTaskMeta(userId) {
  try {
    const raw = localStorage.getItem(`${TASK_META_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeTaskMeta(userId, meta) {
  localStorage.setItem(`${TASK_META_PREFIX}${userId}`, JSON.stringify(meta));
}

function StatusBanner({ message, variant = "error", dark, onDismiss }) {
  if (!message) return null;
  const palette =
    variant === "success"
      ? dark
        ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
        : "border-emerald-100 bg-emerald-50 text-emerald-700"
      : dark
        ? "border-red-500/30 bg-red-950/40 text-red-300"
        : "border-red-100 bg-red-50 text-red-700";

  return (
    <div role="alert" className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 ${palette}`}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1 text-sm font-medium">{message}</p>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss">
          <X className="h-4 w-4 opacity-60 hover:opacity-100" />
        </button>
      )}
    </div>
  );
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

function AuthScreen({ onAuthenticated, t, initialError = null, initialMode = "signin", onBack }) {
  const [mode, setMode] = useState(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState(null);

  const handleSignIn = async (signInEmail, signInPassword) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      });
      if (err) setError(formatAuthError(err));
      else if (data.session) onAuthenticated(data.session);
      else setError("Supabase did not return an authenticated session.");
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    if (mode === "signup") {
      if (!fullName.trim()) {
        setLoading(false);
        setError("Please enter your full name.");
        return;
      }
      try {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (err) setError(formatAuthError(err));
        else if (data.session) onAuthenticated(data.session);
        else {
          setSuccess("Account created! Check your email, then sign in.");
          setMode("signin");
        }
      } catch (err) {
        setError(formatAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }
    await handleSignIn(email.trim(), password);
  };

  return (
    <div className="auth-page">
      <div className="auth-page-glow auth-page-glow-one" />
      <div className="auth-page-glow auth-page-glow-two" />
      <div className="auth-shell">
        <div className="auth-topbar">
          <button type="button" className="auth-brand" onClick={onBack} aria-label="Back to TASKR landing page">
            <BrandLogo className="auth-wordmark" tone="light" />
          </button>
          <button type="button" className="auth-back" onClick={onBack}>Back to site <ChevronLeft className="h-4 w-4" /></button>
        </div>
        <div className="auth-layout">
          <div className="auth-pitch">
            <span className="landing-section-label">The work starts here</span>
            <h1>Bring the scattered pieces <em>into focus.</em></h1>
            <p>Sign in to continue your workspace, or create a calm place for the next idea, task, diagram, and decision.</p>
            <div className="auth-pitch-list"><span><CheckCircle2 className="h-4 w-4" /> Pick up where you left off</span><span><CheckCircle2 className="h-4 w-4" /> Keep every kind of work close</span><span><CheckCircle2 className="h-4 w-4" /> Move from thought to finished</span></div>
          </div>
          <div className="auth-card-wrap">
            <BorderGlow borderRadius={26} glowColor="37 99 235" backgroundColor="#ffffff" className="auth-card-glow">
              <div className="auth-card">
                <div className="auth-card-heading"><span className="auth-card-kicker">Welcome to TASKR</span><h2>{mode === "signin" ? "Welcome back." : "Start with a clear page."}</h2><p>{mode === "signin" ? "Your work is ready when you are." : "Create your account and make space for momentum."}</p></div>
                <div className={`auth-toggle ${t.authToggle}`}>
                  {["signin", "signup"].map((m) => <button key={m} type="button" onClick={() => { setMode(m); setError(null); setSuccess(null); }} className={mode === m ? "is-active" : ""}>{m === "signin" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}{m === "signin" ? "Sign in" : "Sign up"}</button>)}
                </div>
                <StatusBanner message={error} dark={false} onDismiss={() => setError(null)} />
                <StatusBanner message={success} variant="success" dark={false} onDismiss={() => setSuccess(null)} />
                <form onSubmit={handleSubmit} className="auth-form">
                  {mode === "signup" && <label><span>Full name</span><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" autoComplete="name" /></label>}
                  <label><span>Email address</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" autoComplete="email" /></label>
                  <label><span>Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters" autoComplete={mode === "signin" ? "current-password" : "new-password"} /></label>
                  <button type="submit" disabled={loading} className="auth-submit">{loading && <Loader2 className="h-4 w-4 animate-spin" />}{loading ? "Please wait…" : mode === "signup" ? "Create account" : "Continue to TASKR"}<ArrowRight className="h-4 w-4" /></button>
                </form>
                <div className="auth-divider"><span />or<span /></div>
                <button type="button" onClick={() => handleSignIn(JUDGE_EMAIL, JUDGE_PASSWORD)} disabled={loading} className="auth-demo"><Sparkles className="h-4 w-4" /> Try the demo workspace</button>
                <p className="auth-legal">By continuing, you agree to keep your workspace purposeful.</p>
              </div>
            </BorderGlow>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────
// Extracted to src/components/layout/AppHeader.jsx

function SidebarMenu({ open, onClose, activeScreen, onNavigate, t, dark }) {
  const NavButton = ({ id, label, icon: Icon }) => (
    <button
      type="button"
      onClick={() => { onNavigate(id); onClose(); }}
      className={`flex w-full items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${activeScreen === id ? "border-blue-500/40 bg-blue-500/10 text-blue-500" : t.navBtn}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-[120] bg-black/40 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside className={`fixed left-0 top-0 z-[130] h-full w-[280px] transform border-r p-5 transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"} ${dark ? "border-blue-500/20 bg-[#0a0f24]" : "border-zinc-200 bg-white"}`}>
        <div className="flex items-center justify-between mb-8">
          <h2 className={`text-sm font-bold uppercase tracking-wider ${t.textPrimary}`}>Navigation</h2>
          <button type="button" onClick={onClose} className={`rounded-lg p-2 ${t.navBtn}`} aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="space-y-6">
          <div>
            <h3 className={`mb-3 px-1 text-xs font-bold tracking-widest text-slate-400 uppercase`}>Main</h3>
            <nav className="space-y-2">
              <NavButton id="home" label="Home" icon={LayoutGrid} />
            </nav>
          </div>

          <div>
            <h3 className={`mb-3 px-1 text-xs font-bold tracking-widest text-slate-400 uppercase`}>Tools</h3>
            <nav className="space-y-2">
              <NavButton id="sticker" label="Sticker" icon={StickyNote} />
              <NavButton id="finance" label="Finance" icon={PieChart} />
              <NavButton id="workspace" label="Workspace" icon={PenTool} />
              <NavButton id="flow" label="Flow" icon={GitMerge} />
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── Panic Dump (with pre-save subtask builder) ────────────────────────────────

function PanicDump({ t, onSubmit, isSubmitting, selectedDate }) {
  const [manualTitle, setManualTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    if (selectedDate) {
      setDeadline(`${selectedDate}T09:00`);
    }
  }, [selectedDate]);
  const [stickerColor, setStickerColor] = useState("yellow");
  const [subTaskInput, setSubTaskInput] = useState("");
  const [pendingSubTasks, setPendingSubTasks] = useState([]);

  const addSubTask = () => {
    const text = subTaskInput.trim();
    if (!text) return;
    setPendingSubTasks((prev) => [...prev, { text, completed: false }]);
    setSubTaskInput("");
  };

  const removeSubTask = (index) => {
    setPendingSubTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubTaskKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSubTask();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim() || isSubmitting) return;
    try {
      // Pass stickerColor instead of urgencyLevel
      await onSubmit(manualTitle.trim(), description.trim(), deadline, stickerColor, pendingSubTasks);
      setManualTitle("");
      setDescription("");
      setDeadline("");
      setStickerColor("yellow");
      setPendingSubTasks([]);
      setSubTaskInput("");
    } catch { /* parent handles */ }
  };

  return (
    <section className={`rounded-2xl p-5 ${t.card}`}>
      <h2 className={`text-sm font-bold ${t.textPrimary}`}>Task Dump</h2>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className={`mb-1.5 block text-xs font-semibold uppercase ${t.textMuted}`}>Task Title (optional)</label>
          <input
            type="text"
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            placeholder="Type a custom title or leave blank for an automatic title"
            className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 ${t.input}`}
          />
        </div>
        <div>
          <label className={`mb-1.5 block text-xs font-semibold uppercase ${t.textMuted}`}>Task Description</label>
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Dump everything you need to get done…" className={`w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 ${t.input}`} />
        </div>

        {/* Subtask pre-builder */}
        <div>
          <label className={`mb-1.5 block text-xs font-semibold uppercase ${t.textMuted}`}>Subtasks (optional)</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={subTaskInput}
              onChange={(e) => setSubTaskInput(e.target.value)}
              onKeyDown={handleSubTaskKeyDown}
              placeholder="Add a subtask…"
              className={`flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${t.input}`}
            />
            <button
              type="button"
              onClick={addSubTask}
              disabled={!subTaskInput.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {pendingSubTasks.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {pendingSubTasks.map((sub, idx) => (
                <li key={idx} className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs ${t.cardMuted}`}>
                  <span className="text-sm font-medium">{sub.text}</span>
                  <button type="button" onClick={() => removeSubTask(idx)} className="text-red-400 hover:text-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className={`mb-1.5 block text-xs font-semibold uppercase ${t.textMuted}`}>Deadline</label>
          <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 ${t.input}`} />
        </div>
        <div>
          <label className={`mb-3 block text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Select Sticker Color</label>
          <div className="flex flex-wrap gap-3">
            {STICKER_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                onClick={() => setStickerColor(color.id)}
                className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${stickerColor === color.id ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#161f42] scale-110" : ""}`}
                style={{ backgroundColor: color.hex, borderColor: color.id === "white" ? "#cbd5e1" : "rgba(0,0,0,0.16)" }}
                aria-label={color.label}
                title={color.label}
              />
            ))}
          </div>
        </div>
        <button type="submit" disabled={!description.trim() || isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading task...</> : "Upload Task"}
        </button>
      </form>
    </section>
  );
}



// ─── Stickers ──────────────────────────────────────────────────────────────────

function TaskFilterBar({ priorityFilter, dateFilter, onPriorityChange, onDateChange, t, dark }) {
  const inactivePill = dark
    ? "border-blue-500/15 bg-[#161f42]/40 text-slate-400 hover:border-blue-500/30 hover:text-slate-200"
    : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-slate-700";

  return (
    <div className={`mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border px-4 py-3 ${dark ? "border-blue-500/15 bg-[#0d1530]/40" : "border-slate-200/80 bg-white/60"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`mr-1 text-[10px] font-bold uppercase tracking-wider ${t.textMuted}`}>Priority</span>
        {PRIORITY_FILTERS.map((filter) => {
          const isActive = priorityFilter === filter.id;
          const activeClass = filter.pillClass
            ? `${filter.pillClass} border font-semibold ring-2 ring-blue-500/30`
            : `${dark ? "bg-blue-600/20 border-blue-500/40 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"} border font-semibold ring-2 ring-blue-500/30`;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onPriorityChange(filter.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${isActive ? activeClass : inactivePill}`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
      <div className={`hidden h-5 w-px sm:block ${dark ? "bg-blue-500/15" : "bg-slate-200"}`} />
      <div className="flex flex-wrap items-center gap-2">
        <span className={`mr-1 text-[10px] font-bold uppercase tracking-wider ${t.textMuted}`}>Date</span>
        {DATE_FILTERS.map((filter) => {
          const isActive = dateFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onDateChange(filter.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                isActive
                  ? `${dark ? "bg-blue-600/20 border-blue-500/40 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"} font-semibold ring-2 ring-blue-500/30`
                  : inactivePill
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StickerCard({ task, dark, t, onToggleSubTask, onDelete, onEdit, isDeleting, currentTime }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editRawInput, setEditRawInput] = useState(task.rawInput);
  const [editColor, setEditColor] = useState(task.stickerColor || "yellow");

  const verifiedSubTasks = task && Array.isArray(task.subTasks) ? task.subTasks : [];
  const deadlineMs = task?.deadline instanceof Date ? task.deadline.getTime() : new Date().getTime();
  
  const now = currentTime || Date.now();
  const TWENTY_FOUR_HOURS_MS = 86400000;
  const timePassedSinceDeadline = now - deadlineMs;
  const remaining24h = Math.max(0, TWENTY_FOUR_HOURS_MS - timePassedSinceDeadline);
  const isOvertime = now > deadlineMs;
  const showCountdown = (deadlineMs - now) <= TWENTY_FOUR_HOURS_MS && (deadlineMs - now) >= 0;
  
  const handleSave = () => {
    if (onEdit) onEdit(task.id, { title: editTitle, rawInput: editRawInput, color: editColor });
    setIsEditing(false);
  };

  return (
    <article className={`group relative flex h-full w-full flex-col rounded-2xl p-4 shadow-md transition-all overflow-hidden ${getStickerClass(task.stickerColor)} ${isOvertime ? "border-2 border-red-500" : ""}`}>
      
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 transition-all group-hover:opacity-100 z-10">
        {!isEditing && (
          <button type="button" onClick={() => setIsEditing(true)} disabled={isDeleting} className="rounded-lg p-1.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-50" aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={() => onDelete(task.id)} disabled={isDeleting} className="rounded-lg p-1.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-50 text-red-500" aria-label="Delete">
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>

      {isEditing ? (
        <div className="flex flex-col flex-1 gap-2 mt-6">
          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="rounded p-1.5 text-sm font-bold bg-black/5 dark:bg-black/20 outline-none focus:ring-2 focus:ring-blue-500" />
          <textarea value={editRawInput} onChange={(e) => setEditRawInput(e.target.value)} className="rounded p-1.5 text-xs bg-black/5 dark:bg-black/20 flex-1 outline-none resize-none focus:ring-2 focus:ring-blue-500" />
          
          <div className="flex flex-wrap gap-1 mt-1">
            {STICKER_COLORS.map(color => (
              <button
                key={color.id}
                onClick={() => setEditColor(color.id)}
                className={`w-5 h-5 rounded-full ${editColor === color.id ? "ring-2 ring-blue-500" : ""}`}
                style={{ backgroundColor: color.hex, borderColor: "rgba(0,0,0,0.1)", borderWidth: 1 }}
                aria-label={color.label}
                title={color.label}
              />
            ))}
          </div>

          <SaveButton onClick={handleSave} className="mt-2 w-full" />
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-start justify-between gap-2 pr-16">
            {isOvertime ? (
              <h3 className="text-base font-bold leading-snug text-red-600 dark:text-red-400 animate-pulse uppercase">OVERTIME</h3>
            ) : (
              <h3 className="text-base font-bold leading-snug">{task.title}</h3>
            )}
          </div>
          <p className="flex-1 text-xs leading-relaxed overflow-y-auto whitespace-pre-wrap">{task.rawInput}</p>
          {verifiedSubTasks.length > 0 && (
            <ul className="mt-3 space-y-1.5">
          {Array.isArray(verifiedSubTasks) && verifiedSubTasks.map((sub) => (
                <li key={sub.id}>
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-0.5 hover:bg-white/10 transition-colors">
                    <input type="checkbox" checked={sub.completed} onChange={() => onToggleSubTask(task.id, sub.id)} className="peer sr-only" />
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-zinc-300 bg-white peer-checked:border-blue-600 peer-checked:bg-blue-600 transition-colors">
                      {sub.completed && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                    </span>
                    <span className={`text-xs ${sub.completed ? "line-through opacity-60" : "transition-all"}`}>{sub.text || sub.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          
          <div className={`mt-3 flex items-center justify-between border-t pt-3 text-[11px] font-semibold ${dark ? "border-blue-500/15 text-slate-400" : "border-black/5 text-zinc-600"}`}>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-500" />
              {formatDeadline(task.deadline)}
            </div>
            {isOvertime && (
               <div className="flex items-center gap-1 text-red-500 font-mono animate-pulse">
                 <AlertTriangle className="h-3 w-3" />
                 {formatCountdown(remaining24h)}
               </div>
            )}
            {showCountdown && !isOvertime && (
               <div className="flex items-center gap-1 text-amber-500 font-mono">
                 <Clock className="h-3 w-3" />
                 {formatCountdown(deadlineMs - now)}
               </div>
            )}
          </div>
        </>
      )}
    </article>
  );
}

function StickerGrid({ tasks, t, dark, isLoading, deletingTaskId, onToggleSubTask, onDelete, onEdit, currentTime, layout, selectedId, activeId, isDragging, onDragStart, onResizeStart, onBringToFront }) {
  if (isLoading && !tasks.length) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-600" />
        <p className={`text-sm ${t.textMuted}`}>Loading stickers…</p>
      </div>
    );
  }
  return (
    <>
      {tasks.map((task) => {
        const pos = layout[task.id];
        if (!pos) return null;
        const isActive = activeId === task.id;
        const isSelected = selectedId === task.id;
        const wrapperClass = `sticker-wrapper absolute ${
          isActive && isDragging ? "sticker-dragging" : isSelected ? "sticker-idle sticker-selected" : "sticker-idle"
        }`;
        return (
          <div
            key={task.id}
            className={wrapperClass}
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              width: `${pos.w}px`,
              height: `${pos.h}px`,
              zIndex: pos.zIndex || 1,
            }}
            onPointerDown={(e) => onDragStart(task.id, e)}
            onClick={() => onBringToFront(task.id)}
          >
            <StickerCard task={task} dark={dark} t={t} onToggleSubTask={onToggleSubTask} onDelete={onDelete} onEdit={onEdit} isDeleting={deletingTaskId === task.id} currentTime={currentTime} />
            {/* Resize handles at four corners */}
            <div className="resize-handle resize-handle-nw" onPointerDown={(e) => onResizeStart(task.id, "nw", e)} />
            <div className="resize-handle resize-handle-ne" onPointerDown={(e) => onResizeStart(task.id, "ne", e)} />
            <div className="resize-handle resize-handle-sw" onPointerDown={(e) => onResizeStart(task.id, "sw", e)} />
            <div className="resize-handle resize-handle-se" onPointerDown={(e) => onResizeStart(task.id, "se", e)} />
          </div>
        );
      })}
    </>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dark, setDark] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [showAuth, setShowAuth] = useState(false);
  const [activeScreen, setActiveScreen] = useState("home");
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [matrixHeight, setMatrixHeight] = useState(680);

  const [savedWorkspaces, setSavedWorkspaces] = useState(() => {
    return JSON.parse(localStorage.getItem("taskr_saved_workspaces") || "[]");
  });
  const [alertConfig, setAlertConfig] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSaveSticker, setShowSaveSticker] = useState(false);

  const handleSaveWorkspace = useCallback((id, name, type) => {
    setSavedWorkspaces(prev => {
      const existing = prev.find(ws => ws.id === id);
      const updatedAt = Date.now();
      let updated;
      if (existing) {
        updated = prev.map(ws => ws.id === id ? { ...ws, name, type, lastUpdated: "just now", updatedAt } : ws);
      } else {
        updated = [...prev, { id, name, type, lastUpdated: "just now", updatedAt }];
      }
      localStorage.setItem("taskr_saved_workspaces", JSON.stringify(updated));
      return updated;
    });
  }, []);
  
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const requestConfirmation = useCallback((message, onConfirm, isDestructive = false, confirmText = null) => {
    setAlertConfig({
      type: "confirm",
      title: "Confirm Action",
      message,
      onConfirm,
      isDestructive,
      confirmText: confirmText || (isDestructive ? "Delete" : "Confirm")
    });
  }, []);

  const t = useTheme(dark);
  const userId = session?.user?.id;
  const email = session?.user?.email ?? "";
  const fullName = session?.user?.user_metadata?.full_name ?? "";
  const username = getUsernameFromEmail(email) || getFirstName(fullName);
  const filteredTasks = useMemo(
    () => sortByDeadline(filterTasks(tasks, priorityFilter, dateFilter)),
    [tasks, priorityFilter, dateFilter]
  );
  const hasActiveFilters = priorityFilter !== "all" || dateFilter !== "all";

  const canvasRef = useRef(null);
  const filteredTaskIds = useMemo(() => filteredTasks.map(t => String(t.id)), [filteredTasks]);
  const stickerInteractions = useStickerInteractions(
    filteredTaskIds,
    userId,
    canvasRef.current?.offsetWidth || 800
  );

  const fetchTasks = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    const meta = readTaskMeta(userId);
    const { data, error: fetchError } = await supabase.from("tasks").select("*").eq("user_id", userId).order("deadline", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setTasks(sortByDeadline((data ?? []).map((row) => mapSupabaseTask(row, meta))));
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
    }).catch((err) => {
      if (!mounted) return;
      setSession(null);
      setError(formatAuthError(err));
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setAuthLoading(false);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (userId) {
      fetchTasks();
    } else {
      setTasks([]);
    }
  }, [userId, fetchTasks]);

  useEffect(() => {
    const tick = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);

      if (!userId) return;

      const alerts = JSON.parse(localStorage.getItem("TASKR_ALERTS") || "{}");
      let changed = false;
      const currentTasks = tasksRef.current;
      
      currentTasks.forEach(task => {
        if (task.isCompleted) return;
        
        const deadlineMs = task.deadline.getTime();
        const createdMs = task.createdAt ? task.createdAt.getTime() : deadlineMs - 86400000;
        const totalDuration = deadlineMs - createdMs;
        const elapsed = now - createdMs;
        const remaining = deadlineMs - now;
        
        // Half-Time
        if (elapsed >= totalDuration / 2 && remaining > 3600000 && !alerts[`${task.id}_half`]) {
          toast.info(`⏱ Half-Time: "${task.title}"`, { description: "You are halfway through your allocated time." });
          playNotificationSound();
          alerts[`${task.id}_half`] = true;
          changed = true;
        }
        
        // 1-Hour Final Alert (when <= 60 mins remaining and not overtime)
        if (remaining <= 3600000 && remaining > 0 && !alerts[`${task.id}_1h`]) {
          toast.warning(`⏳ 1 Hour Left: "${task.title}"`, { description: "Wrap it up!" });
          playNotificationSound();
          alerts[`${task.id}_1h`] = true;
          changed = true;
        }
        
        // Overtime check & auto-delete
        if (now > deadlineMs) {
          const overtimeMs = now - deadlineMs;
          const ms24h = 24 * 60 * 60 * 1000;
          if (overtimeMs >= ms24h) {
            // Delete task automatically
            supabase.from("tasks").delete().eq("id", task.id).eq("user_id", userId).then(({ error }) => {
               if (!error) {
                 setTasks(prev => prev.filter(tk => tk.id !== task.id));
                 toast.error(`💀 Task Deleted: "${task.title}" expired 24h ago.`);
                 playNotificationSound();
               }
            });
          }
        }
      });
      
      if (changed) {
        localStorage.setItem("TASKR_ALERTS", JSON.stringify(alerts));
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [userId]);

  const handleSignOut = useCallback(async () => {
    let signOutError = null;
    try {
      const result = await supabase.auth.signOut();
      signOutError = result.error;
    } catch (error) {
      signOutError = error;
    } finally {
      setSession(null);
      setTasks([]);
      setAuthMode("signin");
      setShowAuth(true);
      setActiveScreen("home");
      if (signOutError) setError(formatAuthError(signOutError));
    }
  }, []);

  const handleRequestSignOut = useCallback(() => {
    requestConfirmation(
      "Are you sure you want to log out of TASKR?",
      handleSignOut,
      false,
      "Log out"
    );
  }, [handleSignOut, requestConfirmation]);

  const handleCreateTask = useCallback(async (manualTitle, rawInput, deadlineStr, stickerColor, userSubTasks = []) => {
    if (!userId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const smartTitle = manualTitle || createTaskTitle(rawInput);

      const deadline = toIsoDeadline(deadlineStr);
      const plannedDate = dateKey(new Date(deadline));

      const subTasksPayload = userSubTasks.length > 0
        ? userSubTasks.map((st) => ({ text: st.text || st.label, completed: false }))
        : [{ text: "Task over", completed: false }];

      const { data: insertedData, error: dbError } = await supabase.from("tasks").insert([{
        user_id: userId,
        title: smartTitle,
        raw_input: rawInput,
        deadline,
        urgency_score: 5,
        sub_tasks: subTasksPayload,
        is_completed: false,
      }]).select();

      if (dbError) throw new Error(dbError.message);

      if (insertedData && insertedData.length > 0) {
        const freshTaskFromCloud = insertedData[0];
        const meta = readTaskMeta(userId);
        meta[freshTaskFromCloud.id] = { color: stickerColor, plannedDate, createdAt: Date.now() };
        writeTaskMeta(userId, meta);
        setTasks((prev) => sortByDeadline([mapSupabaseTask(freshTaskFromCloud, meta), ...prev]));
      }
    } catch (err) {
      setError(err.message || "Failed to create sticker.");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [userId]);

  // Updated: auto-erase flow when all subtasks are checked
  const handleEditTask = useCallback(async (taskId, updates) => {
    if (!userId) return;
    const task = tasks.find((tk) => tk.id === taskId);
    if (!task) return;
    
    // Save new color to metadata
    const meta = readTaskMeta(userId);
    meta[taskId] = { ...meta[taskId], color: updates.color };
    writeTaskMeta(userId, meta);

    setTasks(prev => prev.map(tk => tk.id === taskId ? {
      ...tk,
      title: updates.title,
      rawInput: updates.rawInput,
      stickerColor: updates.color
    } : tk));

    const { data, error: updateError } = await supabase.from("tasks")
      .update({
        title: updates.title,
        raw_input: updates.rawInput
      })
      .eq("id", taskId).eq("user_id", userId).select().single();
      
    if (updateError) {
      setError(updateError.message);
    } else {
      setTasks((prev) => prev.map((tk) => tk.id === taskId ? mapSupabaseTask(data, meta) : tk));
    }
  }, [userId, tasks]);

  const handleToggleSubTask = useCallback(async (taskId, subTaskId) => {
    if (!userId) return;
    const task = tasks.find((tk) => tk.id === taskId);
    if (!task) return;
    const previous = tasks;
    const updatedSubTasks = task.subTasks.map((st) => st.id === subTaskId ? { ...st, completed: !st.completed } : st);
    const allDone = updatedSubTasks.length > 0 && updatedSubTasks.every((st) => st.completed);

    // Optimistic update
    setTasks((prev) => prev.map((tk) => tk.id === taskId ? { ...tk, subTasks: updatedSubTasks, isCompleted: allDone } : tk));

    const { data, error: updateError } = await supabase.from("tasks")
      .update({ sub_tasks: toDbSubTasks(updatedSubTasks), is_completed: allDone })
      .eq("id", taskId).eq("user_id", userId).select().single();

    if (updateError) {
      setTasks(previous);
      setError(updateError.message);
      return;
    }



    const meta = readTaskMeta(userId);
    setTasks((prev) => sortByDeadline(prev.map((tk) => tk.id === taskId ? mapSupabaseTask(data, meta) : tk)));

    // Auto-erase flow: if all subtasks completed, prompt user
    if (allDone) {
      // Use a slight delay so the UI renders the final check before the dialog
      setTimeout(() => {
        requestConfirmation(
          "Excellent! All subtasks finished. Ready to clear this task from your board?",
          async () => {
            // Delete from Supabase and remove from state
            const { error: deleteError } = await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", userId);
            if (deleteError) {
              setError(deleteError.message);
            } else {
              setTasks((prev) => prev.filter((tk) => tk.id !== taskId));
            }
          },
          true
        );
      }, 100);
    }
  }, [tasks, userId]);

  const handleDelete = useCallback(async (taskId) => {
    if (!userId) return;
    const previous = tasks;
    setDeletingTaskId(taskId);
    setTasks((prev) => prev.filter((tk) => tk.id !== taskId));
    const { error: deleteError } = await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", userId);
    setDeletingTaskId(null);
    if (deleteError) {
      setTasks(previous);
      setError(deleteError.message);
    } else {
    }
  }, [tasks, userId]);

  const handleRescheduleCritical = useCallback(async () => {
    if (!userId) return "Not signed in.";
    const urgent = tasks.filter((tk) => tk.urgencyScore >= 8 && !tk.isCompleted);
    if (!urgent.length) return "No urgent stickers to reschedule.";
    const results = [];
    for (const task of urgent) {
      const fromDate = dateKey(task.deadline);
      const newDeadline = new Date(task.deadline);
      newDeadline.setHours(newDeadline.getHours() + 24);
      const toDate = dateKey(newDeadline);
      const { data, error: updErr } = await supabase.from("tasks")
        .update({ deadline: newDeadline.toISOString(), urgency_score: 6 })
        .eq("id", task.id).eq("user_id", userId).select().single();
      if (updErr) results.push(`Failed: ${task.title}`);
      else {
        const meta = readTaskMeta(userId);
        meta[task.id] = { ...meta[task.id], plannedDate: toDate, urgencyLabel: "Important" };
        writeTaskMeta(userId, meta);
        setTasks((prev) => sortByDeadline(prev.map((tk) => tk.id === task.id ? mapSupabaseTask(data, meta) : tk)));
        results.push(`"${task.title}" → +24h, now Important`);
      }
    }
    return `Rescheduled ${results.length} urgent item(s):\n${results.join("\n")}`;
  }, [tasks, userId]);

  if (authLoading) {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${t.shell}`}>
        <BrandLogo className="loading-wordmark" tone="dark" />
        <Loader2 className="my-4 h-8 w-8 animate-spin text-blue-500" />
        <p className={`text-sm ${t.textMuted}`}>Starting…</p>
      </div>
    );
  }

  if (!session) {
    if (!showAuth) {
      return <LandingPage onOpenAuth={(mode) => { setAuthMode(mode); setShowAuth(true); setError(null); }} />;
    }
    return <AuthScreen onAuthenticated={setSession} t={t} initialError={error} initialMode={authMode} onBack={() => setShowAuth(false)} />;
  }

  const screenTitles = {
    home: "Home",
    sticker: "Sticker Matrix",
    finance: "Finance",
    workspace: "Workspace",
    flow: "Flow"
  };

  return (
    <div className={`min-h-screen flex flex-col ${t.shell}`}>
      <Toaster position="top-right" theme={dark ? "dark" : "light"} />
      <AppHeader 
        email={email} 
        fullName={fullName} 
        t={t} 
        dark={dark}
        onSignOut={handleRequestSignOut}
        onMenuClick={() => setSidebarOpen(true)}
        title={screenTitles[activeScreen] || "TASKR"}
        showAccount={activeScreen === "home"}
      />
      <SidebarMenu
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
        t={t}
        dark={dark}
      />

      <div className="relative w-full h-full">
        {activeScreen === "home" && (
          <ClickSpark sparkColor="#2563eb" sparkCount={10} duration={400}>
            <>
              {error && (
                <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
                  <StatusBanner message={error} dark={dark} onDismiss={() => setError(null)} />
                </div>
              )}
              <DashboardHome
                username={username}
                tasks={tasks}
                savedWorkspaces={savedWorkspaces}
                onNavigate={setActiveScreen}
                t={t}
                dark={dark}
              />
            </>
          </ClickSpark>
        )}

        {activeScreen === "sticker" && (
          <main className="mx-auto w-full max-w-[1680px] px-4 py-6 pb-28 sm:px-6 lg:px-8 xl:px-10">
              {error && <StatusBanner message={error} dark={dark} onDismiss={() => setError(null)} />}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
                <aside className="space-y-6">
                  <PanicDump t={t} onSubmit={handleCreateTask} isSubmitting={isSubmitting} selectedDate={selectedDate} />
                </aside>
                <section className="min-w-0 flex flex-col">
                  <div className="flex items-center justify-between mb-4 shrink-0">
                    <h2 className={`text-sm font-bold ${t.textPrimary}`}>Sticker Matrix</h2>
                    <SaveButton
                      onClick={() => setShowSaveSticker(true)}
                    />
                  </div>
                  <StickerWorkspace
                    taskCount={filteredTasks.length}
                    hasActiveFilters={hasActiveFilters}
                    maxBottom={stickerInteractions.maxBottom}
                    canvasRef={canvasRef}
                    onCanvasClick={stickerInteractions.deselectAll}
                    height={matrixHeight}
                    onHeightChange={setMatrixHeight}
                  >
                    <StickerGrid
                      tasks={filteredTasks}
                      t={t}
                      dark={dark}
                      isLoading={isLoading}
                      deletingTaskId={deletingTaskId}
                      onToggleSubTask={handleToggleSubTask}
                      onDelete={handleDelete}
                      onEdit={handleEditTask}
                      currentTime={currentTime}
                      layout={stickerInteractions.layout}
                      selectedId={stickerInteractions.selectedId}
                      activeId={stickerInteractions.activeId}
                      isDragging={stickerInteractions.isDragging}
                      onDragStart={stickerInteractions.startDrag}
                      onResizeStart={stickerInteractions.startResize}
                      onBringToFront={stickerInteractions.bringToFront}
                    />
                  </StickerWorkspace>
                </section>
              </div>
          </main>
        )}

        {activeScreen === "finance" && (
          <FinanceWorkspace 
            t={t} 
            dark={dark} 
            userId={userId}
            onSave={(name) => handleSaveWorkspace("finance", name, "Finance Workspace")}
          />
        )}

        {activeScreen === "workspace" && (
          <TableWorkspace
            key={userId || "local"}
            userId={userId}
            t={t}
            dark={dark}
            onSave={(name) => handleSaveWorkspace("workspace", name, "Workspace Document")}
          />
        )}

        {activeScreen === "flow" && (
          <Suspense fallback={
            <div className={`flex min-h-[60vh] items-center justify-center ${t.shell}`}>
              <div className="flex items-center gap-3 text-sm font-semibold text-blue-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading Flow Builder…</div>
            </div>
          }>
            <FlowWorkspace key={userId || "local"} dark={dark} userId={userId} />
          </Suspense>
        )}
      </div>

      <CustomAlertModal config={alertConfig} onClose={() => setAlertConfig(null)} dark={dark} />

      {showSaveSticker && (
        <WorkspaceSaveModal
          t={t}
          dark={dark}
          defaultName={savedWorkspaces.find(ws => ws.id === "sticker")?.name || "Startup Roadmap"}
          onSave={(name) => {
            handleSaveWorkspace("sticker", name, "Sticker Workspace");
            setShowSaveSticker(false);
          }}
          onCancel={() => setShowSaveSticker(false)}
        />
      )}
    </div>
  );
}
