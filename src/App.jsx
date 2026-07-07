import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  LayoutGrid,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Plus,
  Pencil,
  Save,
  Send,
  Settings,
  Sparkles,
  Sun,
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
import { handleChatMessage } from "./chat/handler";
import { routeLocalIntent } from "./chat/LocalIntentRouter";
import { GoogleGenAI } from "@google/genai";
import AppHeader from "./components/layout/AppHeader";
import WorkspaceHero from "./components/dashboard/WorkspaceHero";
import ProjectCard from "./components/dashboard/ProjectCard";
import ProjectGrid from "./components/dashboard/ProjectGrid";
import DashboardSection from "./components/dashboard/DashboardSection";
import FinanceWorkspace from "./components/finance/FinanceWorkspace";

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
const GEMINI_MODEL = "gemini-2.5-flash";

const STICKER_COLORS = [
  { id: "yellow", label: "Yellow", class: "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-200 dark:border-yellow-700/50" },
  { id: "blue", label: "Blue", class: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700/50" },
  { id: "green", label: "Green", class: "bg-green-100 text-green-900 border-green-300 dark:bg-green-900/40 dark:text-green-200 dark:border-green-700/50" },
  { id: "pink", label: "Pink", class: "bg-pink-100 text-pink-900 border-pink-300 dark:bg-pink-900/40 dark:text-pink-200 dark:border-pink-700/50" },
  { id: "orange", label: "Orange", class: "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-700/50" },
  { id: "purple", label: "Purple", class: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-700/50" },
  { id: "grey", label: "Grey", class: "bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-900/40 dark:text-slate-200 dark:border-slate-700/50" },
  { id: "white", label: "White", class: "bg-white text-zinc-900 border-zinc-200 dark:bg-[#161f42] dark:text-slate-200 dark:border-blue-500/20" },
];

const QUICK_ACTIONS = [
  { id: "top-priority", label: "What is my top priority?" },
  { id: "get-started", label: "How do I get started?" },
  { id: "reschedule-critical", label: "Reschedule critical items" },
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
      chatPanel: dark
        ? "border-blue-500/20 bg-[#161f42]/95 shadow-black/50"
        : "border-zinc-100 bg-white shadow-blue-900/10",
      chatBubble: dark
        ? "border-blue-500/15 bg-[#0d1530]/90 text-slate-300"
        : "border-zinc-100 bg-zinc-50 text-zinc-700",
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

// ─── Gemini ────────────────────────────────────────────────────────────────────

function getGeminiKey() {
  return import.meta.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
}

async function callGemini(systemInstruction, userText, maxTokens = 256) {
  const apiKey = getGeminiKey();
  if (!apiKey) return null;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: userText }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.35 },
        }),
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

const GEMINI_TOOL_DECLARATIONS = [
  {
    name: "createPlaceholderTasks",
    description: "Creates N number of empty or boilerplate tasks.",
    parameters: {
      type: "OBJECT",
      properties: {
        count: { type: "NUMBER", description: "How many placeholder tasks to create." },
        initialPriority: { type: "STRING", description: "Optional initial priority: Urgent, Important, or Not Important." },
      },
      required: ["count"],
    },
  },
  {
    name: "updateTaskDeadlineByTitle",
    description: "Modifies the deadline string for a specific task.",
    parameters: {
      type: "OBJECT",
      properties: {
        taskTitle: { type: "STRING", description: "Task title to match (exact or close match)." },
        targetDateISO: { type: "STRING", description: "New target deadline as ISO date or natural text." },
      },
      required: ["taskTitle", "targetDateISO"],
    },
  },
  {
    name: "updateTaskPriorityByTitle",
    description: "Changes a task's priority level based on color theory parameters.",
    parameters: {
      type: "OBJECT",
      properties: {
        taskTitle: { type: "STRING", description: "Task title to match (exact or close match)." },
        newPriority: { type: "STRING", description: "New priority: Urgent, Important, or Not Important." },
      },
      required: ["taskTitle", "newPriority"],
    },
  },
];

async function runGeminiWithToolCalling(userMessage, executeTool, taskSummary) {
  const apiKey = getGeminiKey();
  if (!apiKey) return null;

  const systemInstruction = `You are TASKR AI with function-calling.
Available tools: createPlaceholderTasks, updateTaskDeadlineByTitle, updateTaskPriorityByTitle.
When user asks to create placeholders, call createPlaceholderTasks with count and optional initialPriority.
When user asks deadline changes like "tomorrow", call updateTaskDeadlineByTitle.
When user asks to change a task's urgency/priority, call updateTaskPriorityByTitle.
Always prefer tool calls for task mutations.
Current tasks summary: ${JSON.stringify(taskSummary)}`;

  const contents = [{ role: "user", parts: [{ text: userMessage }] }];
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const aggregatedToolSummaries = [];

  for (let i = 0; i < 4; i++) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        tools: [{ functionDeclarations: GEMINI_TOOL_DECLARATIONS }],
        generationConfig: { maxOutputTokens: 350, temperature: 0.25 },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const modelParts = data?.candidates?.[0]?.content?.parts ?? [];
    const functionCalls = modelParts.filter((p) => p.functionCall);

    if (!functionCalls.length) {
      const text = modelParts.map((p) => p.text).filter(Boolean).join("\n").trim();
      return {
        reply: text || (aggregatedToolSummaries.length ? "I've completed the requested task updates." : "Done."),
        toolSummaries: aggregatedToolSummaries,
      };
    }

    contents.push({ role: "model", parts: modelParts });
    for (const part of functionCalls) {
      const { name, args } = part.functionCall;
      const result = await executeTool(name, args || {});
      aggregatedToolSummaries.push(result.summary);
      contents.push({
        role: "user",
        parts: [{
          functionResponse: {
            name,
            response: { result },
          },
        }],
      });
    }

    if (aggregatedToolSummaries.length && i === 3) {
      return {
        reply: "I've completed the requested task updates.",
        toolSummaries: aggregatedToolSummaries,
      };
    }
  }

  return null;
}

async function generateGeminiTitle(description) {
  const prompt =
    "Generate a punchy, highly descriptive 3-5 word title summarizing the following task context. Output ONLY the raw title without quotation marks or conversation.";
  const result = await callGemini(prompt, description, 40);
  if (result) return result.replace(/^["'""]+|["'""]+$/g, "").trim().slice(0, 60);
  const cleaned = description.replace(/\s+/g, " ").trim();
  return cleaned.split(/\s+/).slice(0, 5).join(" ").slice(0, 48) || "New Task";
}

// ─── Urgency helpers ───────────────────────────────────────────────────────────

function urgencyScoreFromLevel(levelId) {
  return URGENCY_LEVELS.find((l) => l.id === levelId)?.score ?? 6;
}

function urgencyLabelFromLevel(levelId) {
  return URGENCY_LEVELS.find((l) => l.id === levelId)?.label ?? "Important";
}

function urgencyLabelFromScore(score) {
  if (score >= 8) return "Urgent";
  if (score >= 5) return "Important";
  return "Not Important";
}

function normalizePriorityToLevelId(priority) {
  const p = String(priority || "").toLowerCase().trim();
  if (p.includes("urgent") || p.includes("red")) return "urgent";
  if (p.includes("not important") || p.includes("green") || p.includes("low")) return "not-important";
  return "important";
}

function resolveDeadlineText(input) {
  const raw = String(input || "").trim().toLowerCase();
  const now = new Date();
  if (!raw) return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  if (raw === "tomorrow") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  }
  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
}

function findBestTaskByTitle(tasks, title) {
  const needle = String(title || "").toLowerCase().trim();
  if (!needle) return null;
  const exact = tasks.find((t) => t.title.toLowerCase() === needle);
  if (exact) return exact;
  const contains = tasks.find((t) => t.title.toLowerCase().includes(needle) || needle.includes(t.title.toLowerCase()));
  if (contains) return contains;
  return tasks.find((t) => {
    const words = needle.split(/\s+/).filter((w) => w.length > 2);
    return words.some((w) => t.title.toLowerCase().includes(w));
  }) ?? null;
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

function getTopPriorityTask(tasks) {
  const active = tasks.filter((t) => !t.isCompleted);
  if (!active.length) return null;
  return [...active].sort((a, b) => {
    if (b.urgencyScore !== a.urgencyScore) return b.urgencyScore - a.urgencyScore;
    return a.deadline.getTime() - b.deadline.getTime();
  })[0];
}

function findTaskByHint(tasks, hint) {
  const lower = hint.toLowerCase();
  if (lower.includes("urgent") || lower.includes("critical") || lower.includes("red")) {
    const match = tasks.filter((t) => t.urgencyScore >= 8 && !t.isCompleted);
    if (match.length) return match[0];
  }
  if (lower.includes("important") || lower.includes("amber") || lower.includes("yellow")) {
    const match = tasks.filter((t) => t.urgencyScore >= 5 && t.urgencyScore < 8 && !t.isCompleted);
    if (match.length) return match[0];
  }
  if (lower.includes("not important") || lower.includes("stable") || lower.includes("green")) {
    const match = tasks.filter((t) => t.urgencyScore < 5 && !t.isCompleted);
    if (match.length) return match[0];
  }
  const top = getTopPriorityTask(tasks);
  if (top && (lower.includes("top") || lower.includes("priority") || lower.includes("first"))) return top;
  const byTitle = tasks.find(
    (t) =>
      lower.includes(t.title.toLowerCase()) ||
      t.title.toLowerCase().split(" ").some((w) => w.length > 3 && lower.includes(w))
  );
  return byTitle ?? top ?? tasks[0] ?? null;
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

// ─── Chat AI ───────────────────────────────────────────────────────────────────

function parseActionsFromGemini(raw) {
  const match = raw.match(/ACTIONS:\s*(\[[\s\S]*?\])/i);
  if (!match) return { reply: raw.replace(/ACTIONS:[\s\S]*/i, "").trim(), actions: [] };
  try {
    return { reply: raw.replace(/ACTIONS:[\s\S]*/i, "").trim(), actions: JSON.parse(match[1]) };
  } catch {
    return { reply: raw, actions: [] };
  }
}

function fallbackChatIntent(message, tasks) {
  const lower = message.toLowerCase();
  const actions = [];
  let reply = "";

  if (lower.match(/^(hi|hello|hey|greetings)/)) {
    reply = "Hey there! I'm your Tasker AI. I can sort your matrix, batch-update tasks, or just help you manage the pressure. What do you need?";
  } else if (lower.includes("remove") || lower.includes("delete") || lower.includes("clear")) {
    const target = findTaskByHint(tasks, lower);
    if (target) {
      actions.push({ type: "delete", taskId: target.id });
      reply = `I'll remove "${target.title}" (${target.urgencyLabel}) from your matrix.`;
    } else reply = "I couldn't find a matching task to remove.";
  } else if (lower.includes("sort") || lower.includes("arrange") || lower.includes("order") || lower.includes("priority")) {
    actions.push({ type: "sort", sortBy: "urgency" });
    reply = "I've re-ordered your active matrix by priority. Urgent tasks are now pinned to the top.";
  } else if (lower.includes("all") && (lower.includes("change") || lower.includes("downgrade") || lower.includes("upgrade"))) {
    const targets = ["urgent", "important", "not important"];
    let foundFilter = null;
    let foundTarget = null;
    targets.forEach(t => {
      if (lower.includes(t)) {
        if (!foundFilter) foundFilter = t;
        else if (foundFilter && !foundTarget && t !== foundFilter) foundTarget = t;
      }
    });
    if (foundFilter && foundTarget) {
      const scoreMap = { "not important": 3, "important": 6, "urgent": 9 };
      const newScore = scoreMap[foundTarget] || 3;
      actions.push({ type: "batch_update", filterUrgency: foundFilter, updates: { urgency_score: newScore } });
      reply = `I'll execute a global batch update on those tasks.`;
    } else {
      reply = "I'm offline and couldn't fully parse the batch update instruction. Be specific, like 'downgrade all Urgent tasks to Not Important'.";
    }
  } else if (lower.includes("lower") || lower.includes("reduce") || lower.includes("downgrade")) {
    const target = findTaskByHint(tasks, lower);
    if (target) {
      actions.push({ type: "update", taskId: target.id, updates: { urgency_score: 3 } });
      reply = `I'll downgrade "${target.title}" to Not Important.`;
    } else reply = "No matching assignment found to downgrade.";
  } else {
    const top = getTopPriorityTask(tasks);
    reply = top
      ? `You currently have ${tasks.length} sticker(s). Your highest-priority task is "${top.title}".`
      : "I can create placeholder tasks, set deadlines, or update priorities for you. Tell me what you want to do next.";
  }
  return { reply, actions };
}

async function processAssistantMessage(message, tasks) {
  const taskPayload = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    urgency_label: t.urgencyLabel,
    deadline: t.deadline.toISOString(),
    is_completed: t.isCompleted,
  }));

  const system = `You are Tasker AI, a highly intelligent, conversational productivity co-pilot with direct Supabase mutation authority.
Tasks: ${JSON.stringify(taskPayload, null, 2)}

Urgency labels: Urgent (red, score:9), Important (amber, score:6), Not Important (green, score:3).
Recognize and respond warmly to greetings ("Hi", "Hello", "Hey"). Provide insightful, high-quality human productivity advice about managing pressure and completing active schedules.
Respond with a conversational reply, then end with an ACTIONS JSON line containing an array of objects.
Actions can be:
- {"type":"delete","taskId":"<uuid>"}
- {"type":"update","taskId":"<uuid>","updates":{"urgency_score":3,"title":"new","deadline":"iso"}}
- {"type":"batch_update","filterUrgency":"Urgent","updates":{"urgency_score":3}}
- {"type":"sort","sortBy":"urgency"}

Example:
Hey there! I've arranged your tasks by priority! Focus on the most urgent ones first to keep the pressure off.
ACTIONS: [{"type":"sort","sortBy":"urgency"}]`;

  const raw = await callGemini(system, message, 400);
  if (raw) return parseActionsFromGemini(raw);
  return fallbackChatIntent(message, tasks);
}

// ─── Branding ──────────────────────────────────────────────────────────────────

function BrandLogo({ className = "h-12 w-auto" }) {
  return <img src="/TASKR.png" alt="Logo" className={className} />;
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

function AuthScreen({ onAuthenticated, t }) {
  const [mode, setMode] = useState("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSignIn = async (signInEmail, signInPassword) => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: signInPassword,
    });
    setLoading(false);
    if (err) setError(err.message);
    else if (data.session) onAuthenticated(data.session);
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
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      setLoading(false);
      if (err) setError(err.message);
      else if (data.session) onAuthenticated(data.session);
      else {
        setSuccess("Account created! Check your email, then sign in.");
        setMode("signin");
      }
      return;
    }
    await handleSignIn(email.trim(), password);
  };

  return (
    <div className={`flex min-h-screen items-center justify-center px-4 py-12 ${t.authShell} relative overflow-hidden`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 text-slate-900 dark:text-white">
        <CheckCircle className="absolute top-10 left-12 rotate-12 h-32 w-32 opacity-5 dark:opacity-[0.03]" />
        <Sparkles className="absolute bottom-20 right-16 -rotate-12 h-32 w-32 opacity-5 dark:opacity-[0.03]" />
        <div className="absolute top-20 right-1/4 text-8xl rotate-[20deg] opacity-5 dark:opacity-[0.03]">⚡</div>
        <div className="absolute bottom-1/4 left-1/4 text-9xl -rotate-[15deg] opacity-5 dark:opacity-[0.03]">✅</div>
        <div className="absolute top-1/2 left-8 text-7xl rotate-[30deg] opacity-5 dark:opacity-[0.03]">🎯</div>
        <div className="absolute bottom-10 left-1/2 text-8xl rotate-[5deg] opacity-5 dark:opacity-[0.03]">📈</div>
      </div>
      <div className="relative w-full max-w-md z-10">
        <div className="mb-10 flex flex-col items-center">
          <BrandLogo className="h-20 w-auto drop-shadow-xl transition-transform hover:scale-105" />
          <h2 className="mt-4 text-sm font-bold uppercase tracking-widest text-slate-500">DO IT FASTER WITH TASKR</h2>
        </div>
        <BorderGlow
          borderRadius={24}
          glowColor={t.shell.includes("0a0f24") ? "217 90 60" : "217 90 50"}
          backgroundColor={t.shell.includes("0a0f24") ? "#161f42" : "#ffffff"}
          className="w-full shadow-2xl"
        >
          <div className="w-full p-6 sm:p-8">
            <div className={`mb-6 flex rounded-xl border p-1 ${t.authToggle}`}>
            {["signin", "signup"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold ${
                  mode === m ? "bg-blue-600 text-white shadow-sm" : t.textMuted
                }`}
              >
                {m === "signin" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>
          <StatusBanner message={error} dark={t.shell.includes("0a0f24")} onDismiss={() => setError(null)} />
          <StatusBanner message={success} variant="success" dark={t.shell.includes("0a0f24")} onDismiss={() => setSuccess(null)} />
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 ${t.input}`} />
            )}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 ${t.input}`} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Password" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 ${t.input}`} />
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Please wait…" : mode === "signup" ? "Create Account" : "Sign In"}
            </button>
          </form>
          <div className="my-6 flex items-center gap-3">
            <div className={`h-px flex-1 ${t.textMuted.includes("slate") ? "bg-blue-500/20" : "bg-zinc-100"}`} />
            <span className={`text-xs uppercase ${t.textMuted}`}>or</span>
            <div className={`h-px flex-1 ${t.textMuted.includes("slate") ? "bg-blue-500/20" : "bg-zinc-100"}`} />
          </div>
          <button type="button" onClick={() => handleSignIn(JUDGE_EMAIL, JUDGE_PASSWORD)} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3.5 text-sm font-bold text-amber-600 dark:text-amber-300">
            ⚡ Quick Demo Access (For Judges)
          </button>
          </div>
        </BorderGlow>
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
              <NavButton id="workspace" label="Workspace" icon={LayoutGrid} />
              <NavButton id="settings" label="Settings" icon={Settings} />
            </nav>
          </div>

          <div>
            <h3 className={`mb-3 px-1 text-xs font-bold tracking-widest text-slate-400 uppercase`}>Tools</h3>
            <nav className="space-y-2">
              <NavButton id="sticker" label="Sticker" icon={StickyNote} />
              <NavButton id="finance" label="Finance" icon={PieChart} />
              <NavButton id="table" label="Table" icon={Table} />
              <NavButton id="draw" label="Draw" icon={PenTool} />
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
            placeholder="Type a custom title or leave blank for smart title"
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
                style={{ backgroundColor: color.id === "white" ? "#f8fafc" : color.hex, borderColor: "rgba(0,0,0,0.1)" }}
                aria-label={color.label}
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
    <article className={`group relative flex w-full flex-col rounded-2xl p-4 shadow-md transition-all overflow-hidden ${getStickerClass(task.stickerColor)} ${isOvertime ? "border-2 border-red-500" : ""}`}>
      
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
              />
            ))}
          </div>

          <button onClick={handleSave} className="mt-2 bg-blue-500 text-white rounded-lg p-2 text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-600 transition-colors">
            <Save className="h-3 w-3" /> Save Changes
          </button>
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

// ─── Settings ──────────────────────────────────────────────────────────────────

function SettingsScreen({ dark, setDark, t, onResetAll, isResetting, dbStatus, uptime, taskCount, onMenuClick }) {
  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">

      <div className="space-y-4">
        <section className={`rounded-2xl p-5 ${t.card}`}>
          <h3 className={`text-sm font-bold ${t.textPrimary}`}>Theme Variant</h3>
          <p className={`mt-1 text-xs ${t.textMuted}`}>Pure white light mode or midnight navy with cobalt glow.</p>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => setDark(false)} className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${!dark ? "border-blue-400 bg-blue-50 text-blue-700 ring-2 ring-blue-200" : "border-zinc-200 text-zinc-500"}`}>
              <Sun className="h-4 w-4" /> Light
            </button>
            <button type="button" onClick={() => setDark(true)} className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${dark ? "border-blue-500/40 bg-[#161f42] text-blue-300 ring-2 ring-blue-500/30" : "border-zinc-200 text-zinc-500"}`}>
              <Moon className="h-4 w-4" /> Midnight
            </button>
          </div>
        </section>

        <section className={`rounded-2xl border p-5 ${dark ? "border-red-500/30 bg-red-950/20" : "border-red-100 bg-red-50/50"}`}>
          <h3 className={`text-sm font-bold ${dark ? "text-red-300" : "text-red-800"}`}>Reset Table Core</h3>
          <p className={`mt-1 text-xs ${dark ? "text-red-400/80" : "text-red-600/80"}`}>Delete all {taskCount} sticker(s) from Supabase.</p>
          <button type="button" onClick={onResetAll} disabled={isResetting || taskCount === 0} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
            {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {isResetting ? "Purging…" : "Reset Dashboard"}
          </button>
        </section>

        <section className={`rounded-2xl p-5 ${t.card}`}>
          <div className="group relative w-full">
            <h3 className={`text-sm font-bold cursor-help border-b border-dashed border-slate-400 pb-0.5 transition-colors hover:text-blue-500 ${t.textPrimary} inline-block`}>
              About
            </h3>
            <div className="hidden group-hover:block w-full text-left pt-2 pb-1 transition-all duration-300">
              <div className={`w-full rounded-xl border p-5 shadow-sm ${t.dropdown}`}>
                <div className={`space-y-3.5 text-xs leading-relaxed ${t.textMuted}`}>
                  <p><strong className={t.textPrimary}>ABOUT TASKR:</strong><br/>TASKR is a high-velocity, intelligent task management workspace engineered to transform chaotic text dumps into optimized, priority-coded action plans. Designed for high-pressure workflows, it bridges the gap between raw intent and flawless execution through an elegant, feature-rich ecosystem:</p>
                  <p><strong className={t.textPrimary}>The Panic Dump &amp; Smart Titles:</strong> Users can quickly offload task details into a unified input stream. TASKR utilizes client-side integration with the Gemini API to instantly analyze descriptions and generate punchy, 3-to-5 word smart titles.</p>
                  <p><strong className={t.textPrimary}>Simplified Urgency Coding:</strong> Tasks are dynamically rendered as visual sticker cards. Backgrounds adapt to soft, modern pastel hues based on a simplified priority vocabulary—Urgent (pastel red), Important (pastel amber), and Not Important (pastel green)—completely eliminating stressful numeric ratings.</p>
                  <p><strong className={t.textPrimary}>Interactive Subtasks &amp; Auto-Erase:</strong> Users can manually append nested subtasks before deploying an item. Checking off the final subtask triggers an instant confirmation alert to purge the task from the board and database automatically.</p>
                  <p><strong className={t.textPrimary}>Consistency Board:</strong> Replacing standard tracking grids, this streamlined, real-time indicator scale tracks a daily Plan-to-Execution Reliability Score. It maps a single moving indicator to shifting emojis (🥲, 😐, 😁, 😃) that react instantly to task changes.</p>
                  <p><strong className={t.textPrimary}>Autonomous AI Chatbar:</strong> A floating, context-aware digital co-pilot with direct Supabase authority allows users to ask for schedule advice or command it to alter and delete records on the fly.</p>
                  <p><strong className={t.textPrimary}>Sleek Dual-Screen Interface:</strong> Seamlessly toggles via a sliding layout between the core workspace and a dedicated settings page featuring an elite, midnight-blue theme variant and a full system clear route.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={`rounded-2xl p-5 ${t.card}`}>
          <h3 className={`text-sm font-bold ${t.textPrimary}`}>System Diagnostics</h3>
          <div className="mt-4 space-y-3">
            <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${t.cardMuted}`}>
              <span className={`text-xs font-medium ${t.textMuted}`}>Session Uptime</span>
              <span className="font-mono text-sm font-bold text-blue-500">{uptime}</span>
            </div>
            <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${t.cardMuted}`}>
              <span className={`flex items-center gap-2 text-xs font-medium ${t.textMuted}`}><Database className="h-3.5 w-3.5" /> Supabase Link</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${dbStatus === "connected" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                {dbStatus === "connected" ? "Validated" : dbStatus === "checking" ? "Checking…" : "Offline"}
              </span>
            </div>
            <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${t.cardMuted}`}>
              <span className={`text-xs font-medium ${t.textMuted}`}>Gemini API</span>
              <span className={`text-xs font-bold ${getGeminiKey() ? "text-emerald-500" : "text-amber-500"}`}>
                {getGeminiKey() ? "Key detected" : "Local fallback"}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── AI drawer ─────────────────────────────────────────────────────────────────

function AiAssistantDrawer({ tasks, t, dark, onExecuteActions, onRunAgent }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState([{
    id: "welcome",
    role: "assistant",
    text: "Hey! I'm your TASKR Copilot. I can help organize, create, or manage your tasks. Just ask.",
  }]);
  const feedRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages, thinking]);

  const push = (role, text) => setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, role, text }]);

  const runQuery = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    push("user", trimmed);
    setInput("");
    setThinking(true);
    let finalReply = "";
    if (onRunAgent) {
      const result = await onRunAgent(trimmed);
      finalReply = result?.text || (typeof result === "string" ? result : "Operations completed successfully.");
    } else {
      const { reply, actions } = await processAssistantMessage(trimmed, tasks);
      finalReply = reply;
      if (actions.length) finalReply = `${reply}\n\n${await onExecuteActions(actions)}`;
    }
    push("assistant", finalReply);
    setThinking(false);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen((v) => !v)} className={`fixed right-8 bottom-8 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_0_30px_-5px_rgba(37,99,235,0.4)] ring-1 ring-blue-500/20 transition-all duration-300 hover:scale-105 hover:bg-blue-700 ${!open ? "animate-pulse" : ""}`}>
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </button>
      <div className={`fixed right-8 bottom-28 z-[70] flex w-[min(100vw-4rem,500px)] flex-col overflow-hidden rounded-[2rem] border shadow-2xl transition-all duration-300 backdrop-blur-3xl ${dark ? "border-white/10 bg-[#0a0f24]/90 shadow-blue-900/20" : "border-slate-200/60 bg-white/90 shadow-slate-300/50"} ${open ? "translate-y-0 opacity-100 scale-100" : "pointer-events-none translate-y-8 opacity-0 scale-95"}`} style={{ maxHeight: "min(80vh, 700px)" }}>
        
        {/* Header - Minimal workspace feel */}
        <div className={`flex items-center justify-between px-8 py-6 ${dark ? "border-white/5" : "border-slate-100"}`}>
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-blue-500" />
            <h2 className={`text-lg font-bold tracking-tight ${t.textPrimary}`}>TASKR Copilot</h2>
          </div>
          <button type="button" onClick={() => setOpen(false)} className={`rounded-full p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/10`}><X className="h-5 w-5 opacity-50 hover:opacity-100 transition-opacity" /></button>
        </div>

        {/* Message Feed - Document format, no chat bubbles */}
        <div ref={feedRef} className="flex-1 overflow-y-auto px-8 py-4 scroll-smooth">
          <div className="space-y-10 pb-8">
            {messages.map((msg) => {
              if (msg.role === "metrics") return null;
              return (
                <div key={msg.id} className="group flex flex-col gap-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${msg.role === "user" ? "text-blue-500" : t.textMuted}`}>
                    {msg.role === "user" ? "You" : "TASKR Copilot"}
                  </span>
                  <div className={`text-[14px] leading-relaxed whitespace-pre-wrap ${t.textPrimary}`}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
            
            {thinking && (
              <div className="flex flex-col gap-2">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>TASKR Copilot</span>
                <div className={`flex items-center gap-1.5 h-6`}>
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Floating Command Palette Input */}
        <div className="px-6 pb-6 pt-2">
          <form onSubmit={(e) => { e.preventDefault(); runQuery(input); }} className={`relative flex items-center overflow-hidden rounded-[1.5rem] border shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:shadow-md ${dark ? "bg-[#161f42]/60 border-blue-500/20" : "bg-slate-50/80 border-slate-200"}`}>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a command or ask a question..." disabled={thinking} className={`flex-1 bg-transparent px-6 py-4 text-[14px] outline-none disabled:opacity-50 ${dark ? "text-white placeholder-slate-500" : "text-slate-900 placeholder-slate-400"}`} />
            <div className="pr-3 pl-2">
              <button type="submit" disabled={!input.trim() || thinking} className={`flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white transition-all hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 ${input.trim() && !thinking ? "scale-100 shadow-sm" : "scale-95"}`}>
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
          
          <div className="mt-4 flex flex-wrap gap-2 px-2">
            {QUICK_ACTIONS.map((a) => (
              <button key={a.id} type="button" onClick={() => runQuery(a.label)} disabled={thinking} className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-50 ${dark ? "border-blue-500/15 bg-transparent text-slate-400 hover:bg-blue-500/10 hover:text-blue-300" : "border-slate-200 bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}>
                {a.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dark, setDark] = useState(false);
  const [activeScreen, setActiveScreen] = useState("workspace");
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [matrixHeight, setMatrixHeight] = useState(500);

  const [dbStatus, setDbStatus] = useState("checking");
  const [sessionStart] = useState(() => Date.now());
  const [financeDocName, setFinanceDocName] = useState(() => {
    return localStorage.getItem("taskr_finance_doc_name") || "";
  });
  const [uptime, setUptime] = useState("00:00:00");
  const [alertConfig, setAlertConfig] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const requestConfirmation = useCallback((message, onConfirm, isDestructive = false) => {
    setAlertConfig({
      type: "confirm",
      title: "Confirm Action",
      message,
      onConfirm,
      isDestructive,
      confirmText: isDestructive ? "Delete" : "Confirm"
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
      setDbStatus("offline");
    } else {
      setTasks(sortByDeadline((data ?? []).map((row) => mapSupabaseTask(row, meta))));
      setDbStatus("connected");

    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
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
      
      const secs = Math.floor((now - sessionStart) / 1000);
      const h = String(Math.floor(secs / 3600)).padStart(2, "0");
      const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
      const s = String(secs % 60).padStart(2, "0");
      setUptime(`${h}:${m}:${s}`);

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
  }, [sessionStart, userId]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setTasks([]);

    setActiveScreen("workspace");
  };

  const handleCreateTask = useCallback(async (manualTitle, rawInput, deadlineStr, stickerColor, userSubTasks = []) => {
    if (!userId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      let smartTitle = manualTitle;
      if (!smartTitle) {
        try {
          const apiKey = getGeminiKey();
          if (apiKey) {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: [{ role: "user", parts: [{ text: "Create a catchy 2-3 word title explaining this task context. Do not include quotes: " + rawInput }] }]
            });
            const extractedText = response?.text;
            if (extractedText && extractedText.trim()) {
              smartTitle = extractedText.trim().replace(/['"]+/g, "").replace(/[#*]/g, "");
            }
          }
        } catch (err) {
          console.warn("Gemini offline, engaging local smart extraction engine...", err);
        }
      }

      if (!smartTitle || smartTitle.toLowerCase() === "new task") {
        const cleanText = rawInput.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
        const words = cleanText.split(/\s+/).filter(w => w.length > 2);
        if (words.length > 0) {
          const firstWord = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
          const secondWord = words[1] ? words[1].toLowerCase() : "";
          const thirdWord = words[2] ? words[2].toLowerCase() : "";
          smartTitle = `${firstWord} ${secondWord} ${thirdWord}`.trim();
        } else {
          smartTitle = "Quick Task Node";
        }
      }

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

  const handleResetAll = useCallback(() => {
    if (!userId || !tasks.length) return;
    requestConfirmation(
      `Delete all ${tasks.length} stickers permanently?`,
      async () => {
        setIsResetting(true);
        const { error: deleteError } = await supabase.from("tasks").delete().eq("user_id", userId);
        setIsResetting(false);
        if (deleteError) setError(deleteError.message);
        else {
          setTasks([]);
          writeTaskMeta(userId, {});
        }
      },
      true
    );
  }, [userId, tasks.length, requestConfirmation]);

  const handleExecuteActions = useCallback(async (actions) => {
    if (!userId || !actions.length) return "";
    const summaries = [];
    const meta = readTaskMeta(userId);

    for (const action of actions) {
      if (action.type === "delete" && action.taskId) {
        const task = tasks.find((tk) => tk.id === action.taskId);
        const { error: delErr } = await supabase.from("tasks").delete().eq("id", action.taskId).eq("user_id", userId);
        if (delErr) summaries.push(`❌ Failed to delete: ${delErr.message}`);
        else {
          setTasks((prev) => prev.filter((tk) => tk.id !== action.taskId));
          summaries.push(`✅ Deleted "${task?.title ?? "task"}" (${task?.urgencyLabel ?? ""}).`);
        }
      }
      if (action.type === "update" && action.taskId) {
        const updates = { ...action.updates };
        if (action.urgency_score !== undefined) updates.urgency_score = action.urgency_score;
        const { data, error: updErr } = await supabase.from("tasks").update(updates).eq("id", action.taskId).eq("user_id", userId).select().single();
        if (updErr) summaries.push(`❌ Update failed: ${updErr.message}`);
        else {
          if (updates.urgency_label || updates.urgency_score !== undefined) {
             meta[action.taskId] = { ...meta[action.taskId], urgencyLabel: updates.urgency_label ?? urgencyLabelFromScore(updates.urgency_score || data.urgency_score) };
             writeTaskMeta(userId, meta);
          }
          setTasks((prev) => prev.map((tk) => tk.id === action.taskId ? mapSupabaseTask(data, meta) : tk));
          summaries.push(`✅ Updated "${data.title}" successfully.`);
        }
      }
      if (action.type === "batch_update" && action.filterUrgency) {
        const targetLabel = action.filterUrgency.toLowerCase();
        const targets = tasks.filter(t => t.urgencyLabel.toLowerCase() === targetLabel);
        if (!targets.length) {
          summaries.push(`⚠️ No tasks found matching urgency "${action.filterUrgency}".`);
          continue;
        }
        
        const dbUpdates = { ...action.updates };
        const { error: batchErr } = await supabase.from("tasks")
          .update(dbUpdates)
          .eq("user_id", userId)
          .in("id", targets.map(t => t.id));
          
        if (batchErr) summaries.push(`❌ Batch update failed: ${batchErr.message}`);
        else {
          const { data } = await supabase.from("tasks").select("*").in("id", targets.map(t => t.id));
          if (data) {
             targets.forEach(t => {
                if (dbUpdates.urgency_label || dbUpdates.urgency_score !== undefined) {
                   meta[t.id] = { ...meta[t.id], urgencyLabel: dbUpdates.urgency_label ?? urgencyLabelFromScore(dbUpdates.urgency_score) };
                }
             });
             writeTaskMeta(userId, meta);
             setTasks(prev => prev.map(tk => {
               const updatedDb = data.find(d => d.id === tk.id);
               return updatedDb ? mapSupabaseTask(updatedDb, meta) : tk;
             }));
          }
          summaries.push(`✅ Batch updated ${targets.length} cards.`);
          setAlertConfig({
             type: "info",
             title: "Batch Update Successful",
             message: `Successfully modified ${targets.length} "${action.filterUrgency}" tasks.`,
             onConfirm: () => setAlertConfig(null),
             isDestructive: false,
             confirmText: "Got it"
          });
        }
      }
      if (action.type === "sort" && action.sortBy) {
        if (action.sortBy === "urgency") {
          setTasks(prev => [...prev].sort((a, b) => b.urgencyScore - a.urgencyScore));
          summaries.push(`✅ Tasks sorted by priority.`);
        }
      }
    }

    return summaries.join("\n") || "Actions completed.";
  }, [tasks, userId]);

  const handleAgentMessage = useCallback(async (message) => {
    if (!userId) return "Please sign in first.";

    const localResponse = routeLocalIntent(message, tasksRef.current);
    if (localResponse) {
      return localResponse;
    }

    const taskSummary = tasksRef.current.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.urgencyLabel,
      deadline: t.deadline.toISOString(),
      isCompleted: t.isCompleted,
    }));

    const log = {
      info: (...args) => console.info(...args),
      warn: (...args) => console.warn(...args),
      error: (...args) => console.error(...args),
    };

    const result = await handleChatMessage({
      apiKey: getGeminiKey(),
      model: GEMINI_MODEL,
      userId,
      userInput: message,
      taskSummary,
      logger: log,
    });

    if (result?.toolResults?.some((r) => r.ok)) {
      await fetchTasks();
      const successful = result.toolResults.filter((r) => r.ok).length;
      toast.success(`AI Agent executed ${successful} tool call${successful > 1 ? "s" : ""}.`);
    }

    const failed = result?.toolResults?.filter((r) => !r.ok) ?? [];
    if (failed.length) {
      toast.error(`AI Agent hit ${failed.length} tool error${failed.length > 1 ? "s" : ""}.`);
    }

    return result || { text: "I could not complete that request." };
  }, [fetchTasks, userId]);

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
        <BrandLogo />
        <Loader2 className="my-4 h-8 w-8 animate-spin text-blue-500" />
        <p className={`text-sm ${t.textMuted}`}>Starting…</p>
      </div>
    );
  }

  if (!session) return <AuthScreen onAuthenticated={setSession} t={t} />;

  const screenTitles = {
    workspace: "Workspace",
    sticker: "Sticker Matrix",
    settings: "Settings",
    finance: "Finance",
    table: "Table",
    draw: "Draw",
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
        onSignOut={handleSignOut}
        onMenuClick={() => setSidebarOpen(true)}
        title={screenTitles[activeScreen] || "TASKR"}
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
        {activeScreen === "workspace" && (
          <ClickSpark sparkColor="#2563eb" sparkCount={10} duration={400}>
            <main className={`mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 lg:px-8 mt-2 lg:mt-6 mb-6 rounded-[2.5rem] relative
              before:absolute before:inset-0 before:-z-10 before:rounded-[2.5rem] 
              before:shadow-[0_0_80px_-15px_rgba(59,130,246,0.15)] 
              before:ring-1 before:ring-blue-500/10 
              ${dark ? "before:bg-[#0a0f24]" : "before:bg-white"}
              transition-all duration-500`}>
              {error && <StatusBanner message={error} dark={dark} onDismiss={() => setError(null)} />}
              
              <WorkspaceHero username={username} t={t} dark={dark} />
              
              <DashboardSection title="Active Projects" t={t}>
                <ProjectGrid>
                  <ProjectCard 
                    project={{ name: "Startup Roadmap", lastUpdated: "recently", taskCount: tasks.length, type: "Sticker Workspace" }}
                    onClick={() => setActiveScreen("sticker")}
                    t={t}
                    dark={dark}
                  />
                  {financeDocName && (
                    <ProjectCard 
                      project={{ name: financeDocName, lastUpdated: "recently", taskCount: "Active", type: "Finance Workspace" }}
                      onClick={() => setActiveScreen("finance")}
                      t={t}
                      dark={dark}
                    />
                  )}
                </ProjectGrid>
              </DashboardSection>
            </main>
          </ClickSpark>
        )}

        {activeScreen === "sticker" && (
          <ClickSpark sparkColor="#2563eb" sparkCount={10} duration={400}>
            <main className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 lg:px-8">
              {error && <StatusBanner message={error} dark={dark} onDismiss={() => setError(null)} />}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="space-y-6 lg:col-span-4">
                  <PanicDump t={t} onSubmit={handleCreateTask} isSubmitting={isSubmitting} selectedDate={selectedDate} />
                </div>
                <div className="lg:col-span-8 flex flex-col">
                  <h2 className={`mb-4 text-sm font-bold shrink-0 ${t.textPrimary}`}>Sticker Matrix</h2>
                  <StickerWorkspace
                    dark={dark}
                    t={t}
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
                </div>
              </div>
            </main>
          </ClickSpark>
        )}

        {activeScreen === "settings" && (
          <SettingsScreen dark={dark} setDark={setDark} t={t} onResetAll={handleResetAll} isResetting={isResetting} dbStatus={dbStatus} uptime={uptime} taskCount={tasks.length} onMenuClick={() => setSidebarOpen(true)} />
        )}

        {activeScreen === "finance" && (
          <FinanceWorkspace 
            t={t} 
            dark={dark} 
            onSave={(name) => {
              setFinanceDocName(name);
              localStorage.setItem("taskr_finance_doc_name", name);
            }} 
          />
        )}

        {["table", "draw", "flow"].includes(activeScreen) && (
          <div className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 lg:px-8 min-h-[60vh] flex flex-col items-center justify-center relative">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className={`absolute top-6 left-4 inline-flex items-center rounded-lg p-3 transition-colors border shadow-sm ${dark ? "border-blue-500/20 bg-[#161f42]/80 text-slate-400 hover:text-blue-500" : "border-slate-200 bg-white text-slate-500 hover:text-blue-500"}`}
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className={`rounded-3xl border border-dashed p-12 text-center max-w-md ${dark ? "border-slate-700 bg-slate-900/50" : "border-slate-300 bg-slate-50"}`}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 mb-4">
                <Sparkles className="h-8 w-8 text-blue-500" />
              </div>
              <h2 className={`mb-2 text-xl font-bold capitalize ${t.textPrimary}`}>{activeScreen} Workspace</h2>
              <p className={`text-sm leading-relaxed ${t.textMuted}`}>
                The {activeScreen} module is currently under construction. Please check back in a future update.
              </p>
            </div>
          </div>
        )}
      </div>

      <CustomAlertModal config={alertConfig} onClose={() => setAlertConfig(null)} dark={dark} />

      {activeScreen === "sticker" && (
        <AiAssistantDrawer tasks={tasks} t={t} dark={dark} onExecuteActions={handleExecuteActions} onRunAgent={handleAgentMessage} />
      )}
    </div>
  );
}
