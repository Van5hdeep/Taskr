import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  Database,
  LayoutGrid,
  Loader2,
  LogIn,
  LogOut,
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
} from "lucide-react";
import { supabase } from "./supabaseClient";
import BorderGlow from "./components/BorderGlow/BorderGlow";
import { Toaster, toast } from "sonner";

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
const RELIABILITY_STORAGE_PREFIX = "tasker_reliability_";
const TASK_META_PREFIX = "tasker_task_meta_";
const GEMINI_MODEL = "gemini-2.0-flash";

const URGENCY_LEVELS = [
  { id: "urgent", label: "Urgent", score: 9 },
  { id: "important", label: "Important", score: 6 },
  { id: "not-important", label: "Not Important", score: 3 },
];

const QUICK_ACTIONS = [
  { id: "top-priority", label: "What is my top priority?" },
  { id: "get-started", label: "How do I get started?" },
  { id: "reschedule-critical", label: "Reschedule critical items" },
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

function ragStickerClass(score, dark) {
  if (score >= 8) {
    return dark
      ? "bg-red-950/40 border border-red-500/30 text-slate-100"
      : "bg-red-50/90 border border-red-200/60 text-zinc-900";
  }
  if (score >= 5) {
    return dark
      ? "bg-amber-950/35 border border-amber-500/25 text-slate-100"
      : "bg-amber-50/90 border border-amber-200/60 text-zinc-900";
  }
  return dark
    ? "bg-emerald-950/35 border border-emerald-500/25 text-slate-100"
    : "bg-emerald-50/90 border border-emerald-200/60 text-zinc-900";
}

function urgencyBadgeClass(label, dark) {
  if (label === "Urgent") {
    return dark ? "bg-red-500/20 text-red-300" : "bg-red-100/80 text-red-700";
  }
  if (label === "Important") {
    return dark ? "bg-amber-500/20 text-amber-300" : "bg-amber-100/80 text-amber-800";
  }
  return dark ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100/80 text-emerald-800";
}

// ─── Task utilities ────────────────────────────────────────────────────────────

function getFirstName(fullName) {
  if (!fullName || typeof fullName !== "string") return "there";
  return fullName.trim().split(/\s+/)[0];
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
    urgencyLabel: taskMeta.urgencyLabel ?? urgencyLabelFromScore(urgencyScore),
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

// ─── Plan-to-Execution Reliability Engine ──────────────────────────────────────

function readReliabilityStore(userId) {
  try {
    const raw = localStorage.getItem(`${RELIABILITY_STORAGE_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeReliabilityStore(userId, store) {
  localStorage.setItem(`${RELIABILITY_STORAGE_PREFIX}${userId}`, JSON.stringify(store));
}

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

function createDayRecord(userId, date) {
  return {
    userId,
    date,
    tasksPlannedCount: 0,
    tasksCompletedCount: 0,
    tasksRescheduledCount: 0,
    reliabilityScore: null,
    intensityBucket: -1,
  };
}

/** Score = (Completed + 0.5 * Rescheduled) / Total_Planned; bounded 0–1 */
function finalizeDayRecord(record) {
  const total = record.tasksPlannedCount;
  if (total === 0) {
    record.reliabilityScore = null;
    record.intensityBucket = -1;
    return record;
  }
  const overdue = Math.max(0, total - record.tasksCompletedCount - record.tasksRescheduledCount);
  const totalLoad = record.tasksCompletedCount + record.tasksRescheduledCount + overdue;
  if (totalLoad === 0) {
    record.reliabilityScore = null;
    record.intensityBucket = -1;
    return record;
  }
  const raw =
    (record.tasksCompletedCount + 0.5 * record.tasksRescheduledCount) / totalLoad;
  const score = Math.min(1, Math.max(0, raw));
  record.reliabilityScore = score;
  if (score === 0) record.intensityBucket = 0;
  else if (score <= 0.25) record.intensityBucket = 1;
  else if (score <= 0.5) record.intensityBucket = 2;
  else if (score <= 0.75) record.intensityBucket = 3;
  else record.intensityBucket = 4;
  return record;
}

function touchDay(store, userId, date) {
  if (!store[date]) store[date] = createDayRecord(userId, date);
  return store[date];
}

function registerTaskPlanned(userId, taskId, plannedDate, urgencyLabel) {
  const store = readReliabilityStore(userId);
  const meta = readTaskMeta(userId);
  meta[taskId] = { plannedDate, urgencyLabel, createdAt: Date.now() };
  const day = touchDay(store, userId, plannedDate);
  day.tasksPlannedCount += 1;
  finalizeDayRecord(day);
  writeReliabilityStore(userId, store);
  writeTaskMeta(userId, meta);
  return store;
}

function registerTaskCompleted(userId, taskId) {
  const meta = readTaskMeta(userId);
  const taskMeta = meta[taskId];
  if (!taskMeta) return readReliabilityStore(userId);
  const store = readReliabilityStore(userId);
  const plannedDate = taskMeta.plannedDate;
  const day = touchDay(store, userId, plannedDate);
  if (!taskMeta.completedRegistered) {
    day.tasksCompletedCount += 1;
    taskMeta.completedRegistered = true;
    finalizeDayRecord(day);
    writeReliabilityStore(userId, store);
    writeTaskMeta(userId, meta);
  }
  return store;
}

function registerTaskRescheduled(userId, taskId, fromDate, toDate) {
  const meta = readTaskMeta(userId);
  const store = readReliabilityStore(userId);
  const day = touchDay(store, userId, fromDate);
  if (!meta[taskId]?.rescheduleRegistered?.includes(fromDate)) {
    day.tasksRescheduledCount += 1;
    finalizeDayRecord(day);
    if (!meta[taskId]) meta[taskId] = {};
    meta[taskId].rescheduleRegistered = [...(meta[taskId].rescheduleRegistered ?? []), fromDate];
    meta[taskId].plannedDate = toDate;
    writeReliabilityStore(userId, store);
    writeTaskMeta(userId, meta);
  }
  return store;
}

// ─── Consistency Board: compute today's score ────────────────────────────────

function computeTodayReliability(tasks) {
  const today = dateKey(new Date());
  const todayTasks = tasks.filter((t) => {
    const taskDate = dateKey(t.deadline);
    return taskDate === today;
  });
  const total = todayTasks.length;
  if (total === 0) return { score: null, total: 0, completed: 0, rescheduled: 0 };
  const completed = todayTasks.filter((t) => t.isCompleted).length;
  // Rescheduled = 0 for live board (no way to detect without store cross-ref in real-time)
  // We approximate: tasks whose deadline was moved forward by checking meta store
  const rescheduled = 0;
  const score = Math.min(1, Math.max(0, (completed + 0.5 * rescheduled) / total));
  return { score, total, completed, rescheduled };
}

function emojiForScore(score) {
  if (score === null) return { emoji: "😶", label: "No tasks today" };
  if (score < 0.3) return { emoji: "🥲", label: "Struggling" };
  if (score < 0.6) return { emoji: "😐", label: "Neutral" };
  if (score < 0.8) return { emoji: "😁", label: "Happy" };
  return { emoji: "😃", label: "Excellent" };
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
      ? `You have ${tasks.length} sticker(s). Remember to take breaks, but focus on "${top.title}" first.`
      : "Your board is empty - post a task in the Task Dump.";
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

function DashboardHeader({ email, fullName, t, onSignOut, onOpenSettings, activeScreen }) {
  const initials = (fullName || email || "U").split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className={`flex items-center justify-between border-b px-4 py-4 sm:px-6 lg:px-8 ${t.header}`}>
      <div className="flex items-center gap-4">
        <BrandLogo />
        <button type="button" onClick={() => onOpenSettings(activeScreen === "workspace" ? "settings" : "workspace")} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${t.navBtn}`}>
          {activeScreen === "workspace" ? <Settings className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          {activeScreen === "workspace" ? "Settings" : "Workspace"}
        </button>
      </div>
      {/* Profile dropdown with group hover bridge */}
      <div className="relative group py-2">
        <button type="button" className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 shadow-sm ${t.profileBtn}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">{initials}</div>
          <span className={`hidden max-w-[140px] truncate text-sm font-medium sm:inline ${t.textPrimary}`}>{email}</span>
          <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-hover:rotate-180" />
        </button>
        {/* Invisible bridge + dropdown: pt-1 creates hover-safe gap between trigger and menu */}
        <div className="absolute right-0 top-full z-50 hidden w-64 pt-1 group-hover:block">
          {/* Extra invisible bridge area to prevent gap-close */}
          <div className="h-1" />
          <div className={`overflow-hidden rounded-2xl border shadow-xl ${t.dropdown}`}>
            <div className={`border-b px-4 py-3 ${t.shell.includes("0a0f24") ? "border-blue-500/20" : "border-zinc-100"}`}>
              <p className={`text-xs font-semibold uppercase ${t.textMuted}`}>Signed in as</p>
              <p className={`mt-1 truncate text-sm font-medium ${t.textPrimary}`}>{email}</p>
            </div>
            <div className="p-2">
              <button type="button" onClick={onSignOut} className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${t.shell.includes("0a0f24") ? "bg-[#0d1530] text-slate-200 hover:bg-red-950/50 hover:text-red-400" : "bg-zinc-50 text-zinc-700 hover:bg-red-50 hover:text-red-600"}`}>
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── Panic Dump (with pre-save subtask builder) ────────────────────────────────

function PanicDump({ t, onSubmit, isSubmitting, selectedDate }) {
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    if (selectedDate) {
      setDeadline(`${selectedDate}T09:00`);
    }
  }, [selectedDate]);
  const [urgencyLevel, setUrgencyLevel] = useState("important");
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
      await onSubmit(description.trim(), deadline, urgencyLevel, pendingSubTasks);
      setDescription("");
      setDeadline("");
      setUrgencyLevel("important");
      setPendingSubTasks([]);
      setSubTaskInput("");
    } catch { /* parent handles */ }
  };

  return (
    <section className={`rounded-2xl p-5 ${t.card}`}>
      <h2 className={`text-sm font-bold ${t.textPrimary}`}>Task Dump</h2>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
          <label className={`mb-2 block text-xs font-semibold uppercase ${t.textMuted}`}>How urgent is this?</label>
          <div className="grid grid-cols-3 gap-2">
            {URGENCY_LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                onClick={() => setUrgencyLevel(level.id)}
                className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition-all ${
                  urgencyLevel === level.id
                    ? level.id === "urgent"
                      ? "border-red-400 bg-red-50 text-red-700 ring-2 ring-red-200 dark:bg-red-950/40 dark:text-red-300"
                      : level.id === "important"
                        ? "border-amber-400 bg-amber-50 text-amber-800 ring-2 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                        : "border-emerald-400 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : t.shell.includes("0a0f24")
                      ? "border-blue-500/15 bg-[#0d1530]/60 text-slate-500"
                      : "border-zinc-200 bg-zinc-50 text-zinc-500"
                }`}
              >
                {level.label}
              </button>
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

// ─── Consistency Board (Emoji Slider) ──────────────────────────────────────────

function ConsistencyBoard({ tasks, dark, t }) {
  const safeTasksArray = Array.isArray(tasks) ? tasks.filter(Boolean) : [];
  const totalVisible = safeTasksArray.length;
  const completedVisible = safeTasksArray.filter((t) => t.isCompleted).length;
  const score = totalVisible > 0 ? completedVisible / totalVisible : null;
  const total = totalVisible;
  const completed = completedVisible;
  
  const { emoji, label } = emojiForScore(score);
  const displayScore = score !== null ? score : 0;
  const percentage = Math.round(displayScore * 100);

  // Track fill colour for the slider bar
  const barColor =
    score === null
      ? dark ? "bg-slate-700" : "bg-zinc-200"
      : score < 0.3
        ? dark ? "bg-red-500/60" : "bg-red-300"
        : score < 0.6
          ? dark ? "bg-amber-500/60" : "bg-amber-300"
          : score < 0.8
            ? dark ? "bg-blue-500/70" : "bg-blue-400"
            : dark ? "bg-emerald-500/70" : "bg-emerald-400";

  const trackBg = dark ? "bg-[#0d1530]" : "bg-zinc-100";

  return (
    <section className={`rounded-2xl p-5 ${t.card}`}>
      <h2 className={`text-sm font-bold ${t.textPrimary}`}>Consistency Board</h2>

      {/* Emoji slider */}
      <div className="mt-4">
        {/* The slider track */}
        <div className="relative">
          {/* Background track */}
          <div className={`h-3 w-full rounded-full ${trackBg}`}>
            {/* Filled portion */}
            <div
              className={`h-3 rounded-full transition-all duration-500 ease-out ${barColor}`}
              style={{ width: `${Math.max(2, percentage)}%` }}
            />
          </div>
          {/* Emoji node positioned on the slider */}
          <div
            className="absolute -top-4 transition-all duration-500 ease-out"
            style={{ left: `calc(${Math.max(2, Math.min(95, percentage))}% - 16px)` }}
          >
            <span className="text-3xl drop-shadow-md select-none" role="img" aria-label={label}>
              {emoji}
            </span>
          </div>
        </div>

        {/* Scale markers */}
        <div className="mt-6 flex justify-between px-0.5">
          {[0, 0.3, 0.6, 0.8, 1.0].map((v) => (
            <span key={v} className={`text-[10px] font-mono ${t.textMuted}`}>{v.toFixed(1)}</span>
          ))}
        </div>

        {/* Score readout */}
        <div className="mt-3 flex items-center justify-between">
          <span className={`text-xs font-semibold ${t.textMuted}`}>
            {score !== null ? `${label} · ${completed}/${total} done` : "No tasks planned for today"}
          </span>
          {score !== null && (
            <span className="font-mono text-sm font-bold text-blue-500">{percentage}%</span>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Calendar ──────────────────────────────────────────────────────────────────

function CalendarGrid({ tasks, t, dark, onDayClick }) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const todayDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({ day: i, dateStr });
  }
  
  return (
    <section className={`mt-6 rounded-2xl p-5 ${t.card}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className={`text-sm font-bold ${t.textPrimary}`}>Calendar View</h2>
        <span className={`text-xs font-bold uppercase tracking-widest text-blue-500`}>
          {monthNames[currentMonth]} {today.getDate()}, {currentYear}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border bg-slate-200 dark:bg-[#161f42]/40 dark:border-blue-500/10 border-slate-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className={`p-2 text-center text-[10px] font-bold uppercase tracking-wider ${dark ? "bg-[#0d1530] text-slate-400" : "bg-slate-50 text-slate-500"}`}>
            {day}
          </div>
        ))}
        {days.map((d, idx) => {
          if (!d) return <div key={`empty-${idx}`} className={dark ? "bg-[#161f42]/40" : "bg-white"} />;
          
          const safeTasksArray = Array.isArray(tasks) ? tasks.filter(Boolean) : [];
          const dayTasks = safeTasksArray.filter(task => {
            try {
              if (!task || !task.deadline) return false;
              const taskDateStr = task?.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '';
              return taskDateStr === d.dateStr;
            } catch (err) {
              return false;
            }
          });
          const isToday = d.dateStr === todayDateStr;
          const bgClass = isToday 
            ? (dark ? "bg-blue-900/30 text-blue-100" : "bg-blue-50 text-blue-900")
            : (dark ? "bg-[#161f42]/40 text-blue-100" : "bg-white text-slate-700");
          
          return (
            <div 
              key={d.dateStr} 
              onClick={() => onDayClick(d.dateStr)}
              className={`min-h-[100px] p-1.5 transition-colors cursor-pointer hover:bg-blue-500/10 ${bgClass} relative group/cell ${isToday ? "ring-inset ring-2 ring-blue-500 z-10" : ""}`}
            >
              <div className={`text-xs font-semibold mb-1 px-1 ${isToday ? "text-blue-600 dark:text-blue-400" : (dark ? "opacity-70" : "text-slate-500")}`}>{d.day}</div>
              <div className="flex flex-col gap-1">
                {dayTasks.map(task => (
                  <div key={task.id} className="group/pill relative">
                    <div className={`truncate rounded px-1.5 py-0.5 text-[10px] font-bold ${urgencyBadgeClass(task.urgencyLabel, dark)}`}>
                      {task.title}
                    </div>
                    <div className={`absolute bottom-full left-1/2 z-[100] mb-2 hidden w-48 -translate-x-1/2 rounded-lg p-2 text-xs shadow-xl group-hover/pill:block ${t.dropdown}`}>
                      <p className={`line-clamp-4 ${t.textMuted}`}>{task.rawInput}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Stickers ──────────────────────────────────────────────────────────────────

function StickerCard({ task, dark, t, onToggleSubTask, onDelete, onEdit, isDeleting, currentTime }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editRawInput, setEditRawInput] = useState(task.rawInput);
  const [editUrgency, setEditUrgency] = useState(task.urgencyScore >= 8 ? "urgent" : task.urgencyScore >= 5 ? "important" : "not-important");

  const verifiedSubTasks = task && Array.isArray(task.subTasks) ? task.subTasks : [];
  const deadlineMs = task?.deadline instanceof Date ? task.deadline.getTime() : new Date().getTime();
  
  const now = currentTime || Date.now();
  const TWENTY_FOUR_HOURS_MS = 86400000;
  const timePassedSinceDeadline = now - deadlineMs;
  const remaining24h = Math.max(0, TWENTY_FOUR_HOURS_MS - timePassedSinceDeadline);
  const isOvertime = now > deadlineMs;
  const showCountdown = (deadlineMs - now) <= TWENTY_FOUR_HOURS_MS && (deadlineMs - now) >= 0;
  
  const handleSave = () => {
    if (onEdit) onEdit(task.id, { title: editTitle, rawInput: editRawInput, urgencyLevelId: editUrgency });
    setIsEditing(false);
  };

  return (
    <article className={`animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out group relative flex min-h-[220px] flex-col rounded-2xl p-4 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg ${ragStickerClass(task.urgencyScore, dark)} ${isOvertime ? "border-2 border-red-500" : ""}`}>
      
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 transition-all group-hover:opacity-100 z-10">
        {!isEditing && (
          <button type="button" onClick={() => setIsEditing(true)} disabled={isDeleting} className="rounded-lg p-1.5 hover:text-blue-500 disabled:opacity-50 bg-white/20 backdrop-blur-sm" aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={() => onDelete(task.id)} disabled={isDeleting} className="rounded-lg p-1.5 hover:text-red-500 disabled:opacity-50 bg-white/20 backdrop-blur-sm" aria-label="Delete">
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>

      {isEditing ? (
        <div className="flex flex-col flex-1 gap-2 mt-6">
          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="rounded p-1 text-sm font-bold bg-white/40 dark:bg-black/20 outline-none focus:ring-2 focus:ring-blue-500" />
          <textarea value={editRawInput} onChange={(e) => setEditRawInput(e.target.value)} className="rounded p-1 text-xs bg-white/40 dark:bg-black/20 flex-1 outline-none resize-none focus:ring-2 focus:ring-blue-500" />
          <select value={editUrgency} onChange={(e) => setEditUrgency(e.target.value)} className="rounded p-1 text-xs bg-white/40 dark:bg-black/20 outline-none focus:ring-2 focus:ring-blue-500">
            <option value="not-important">Not Important</option>
            <option value="important">Important</option>
            <option value="urgent">Urgent</option>
          </select>
          <button onClick={handleSave} className="mt-2 bg-blue-500 text-white rounded p-1.5 text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-600 transition-colors">
            <Save className="h-3 w-3" /> Save Changes
          </button>
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-start justify-between gap-2 pr-12">
            {isOvertime ? (
              <h3 className="text-base font-bold leading-snug text-red-600 dark:text-red-400 animate-pulse uppercase">OVERTIME</h3>
            ) : (
              <h3 className="text-base font-bold leading-snug">{task.title}</h3>
            )}
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${urgencyBadgeClass(task.urgencyLabel, dark)}`}>
              {task.urgencyLabel}
            </span>
          </div>
          <p className={`line-clamp-3 flex-1 text-xs leading-relaxed ${t.textMuted}`}>{task.rawInput}</p>
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

function StickerGrid({ tasks, t, dark, isLoading, deletingTaskId, onToggleSubTask, onDelete, onEdit, currentTime }) {
  if (isLoading && !tasks.length) {
    return (
      <div className={`flex flex-col items-center justify-center rounded-2xl border py-20 ${t.card}`}>
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-600" />
        <p className={`text-sm ${t.textMuted}`}>Loading stickers…</p>
      </div>
    );
  }
  if (!tasks.length) {
    return (
      <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 ${t.cardMuted}`}>
        <p className={`text-sm font-semibold ${t.textPrimary}`}>No stickers yet</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {tasks.map((task) => (
        <StickerCard key={task.id} task={task} dark={dark} t={t} onToggleSubTask={onToggleSubTask} onDelete={onDelete} onEdit={onEdit} isDeleting={deletingTaskId === task.id} currentTime={currentTime} />
      ))}
    </div>
  );
}

// ─── Settings ──────────────────────────────────────────────────────────────────

function SettingsScreen({ dark, setDark, t, onResetAll, isResetting, dbStatus, uptime, taskCount }) {
  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <h2 className={`mb-6 text-xl font-bold ${t.textPrimary}`}>Settings & Workspace Core</h2>
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

function AiAssistantDrawer({ tasks, t, dark, onExecuteActions }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState([{
    id: "welcome",
    role: "assistant",
    text: "I'm your Tasker copilot with live database authority. Ask me to prioritize, delete, or change urgency on any sticker.",
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
    const { reply, actions } = await processAssistantMessage(trimmed, tasks);
    let finalReply = reply;
    if (actions.length) finalReply = `${reply}\n\n${await onExecuteActions(actions)}`;
    push("assistant", finalReply);
    setThinking(false);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen((v) => !v)} className={`fixed right-5 bottom-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg ring-4 ring-blue-400/30 hover:bg-blue-700 ${!open ? "animate-pulse" : ""}`}>
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>
      <div className={`fixed right-5 bottom-24 z-[70] flex w-[min(100vw-2.5rem,400px)] flex-col overflow-hidden rounded-2xl border shadow-2xl transition-all duration-300 ${t.chatPanel} ${open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`} style={{ maxHeight: "min(72vh, 540px)" }}>
        <div className={`flex items-center justify-between border-b px-4 py-3 ${dark ? "border-blue-500/20 bg-[#0d1530]/80" : "border-zinc-100 bg-zinc-50"}`}>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><Sparkles className="h-4 w-4" /></div>
            <div>
              <p className={`text-sm font-bold ${t.textPrimary}`}>Tasker AI</p>
              <p className={`text-[10px] ${t.textMuted}`}>{tasks.length} stickers · mutating</p>
            </div>
          </div>
          <button type="button" onClick={() => setOpen(false)}><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <div className={`flex flex-wrap gap-1.5 border-b px-3 py-2 ${dark ? "border-blue-500/15" : "border-zinc-100"}`}>
          {QUICK_ACTIONS.map((a) => (
            <button key={a.id} type="button" onClick={() => runQuery(a.label)} disabled={thinking} className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold text-blue-600 dark:text-blue-300 disabled:opacity-50">
              {a.label}
            </button>
          ))}
        </div>
        <div ref={feedRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-xs leading-relaxed ${msg.role === "user" ? "bg-blue-600 text-white" : t.chatBubble}`}>{msg.text}</div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs ${t.chatBubble}`}>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" /> Analyzing & executing…
              </div>
            </div>
          )}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); runQuery(input); }} className={`flex items-center gap-2 border-t p-3 ${dark ? "border-blue-500/15" : "border-zinc-100"}`}>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder='e.g. "Remove my urgent task"' disabled={thinking} className={`flex-1 rounded-xl border px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 ${t.input}`} />
          <button type="submit" disabled={!input.trim() || thinking} className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"><Send className="h-4 w-4" /></button>
        </form>
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
  const [reliabilityStore, setReliabilityStore] = useState({});
  const [dbStatus, setDbStatus] = useState("checking");
  const [sessionStart] = useState(() => Date.now());
  const [uptime, setUptime] = useState("00:00:00");
  const [alertConfig, setAlertConfig] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  
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
  const firstName = getFirstName(fullName);

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
      setReliabilityStore(readReliabilityStore(userId));
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
      setReliabilityStore(readReliabilityStore(userId));
    } else {
      setTasks([]);
      setReliabilityStore({});
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
    setReliabilityStore({});
    setActiveScreen("workspace");
  };

  const handleCreateTask = useCallback(async (rawInput, deadlineStr, urgencyLevelId, userSubTasks = []) => {
    if (!userId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      let smartTitle = "";
      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
        if (apiKey) {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
          const apiResponse = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "Create a catchy 2-3 word title explaining this task context. Do not include quotes: " + rawInput }] }]
            })
          });
          const data = await apiResponse.json();
          const extractedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (extractedText && extractedText.trim()) {
            smartTitle = extractedText.trim().replace(/['"]+/g, '').replace(/[#*]/g, '');
          }
        }
      } catch (err) {
        console.warn("Gemini offline, engaging local smart extraction engine...", err);
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
      const urgencyScore = urgencyScoreFromLevel(urgencyLevelId);
      const urgencyLabel = urgencyLabelFromLevel(urgencyLevelId);
      const plannedDate = dateKey(new Date(deadline));

      const subTasksPayload = userSubTasks.length > 0
        ? userSubTasks.map((st) => ({ text: st.text || st.label, completed: false }))
        : [{ text: "Task over", completed: false }];

      const { data: insertedData, error: dbError } = await supabase.from("tasks").insert([{
        user_id: userId,
        title: smartTitle,
        raw_input: rawInput,
        deadline,
        urgency_score: urgencyScore,
        sub_tasks: subTasksPayload,
        is_completed: false,
      }]).select();

      if (dbError) throw new Error(dbError.message);

      if (insertedData && insertedData.length > 0) {
        const freshTaskFromCloud = insertedData[0];
        const store = registerTaskPlanned(userId, freshTaskFromCloud.id, plannedDate, urgencyLabel);
        setReliabilityStore({ ...store });
        setTasks((prev) => sortByDeadline([mapSupabaseTask(freshTaskFromCloud, readTaskMeta(userId)), ...prev]));
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
    
    const urgencyScore = urgencyScoreFromLevel(updates.urgencyLevelId);
    const urgencyLabel = urgencyLabelFromLevel(updates.urgencyLevelId);
    
    setTasks(prev => prev.map(tk => tk.id === taskId ? {
      ...tk,
      title: updates.title,
      rawInput: updates.rawInput,
      urgencyScore,
      urgencyLabel
    } : tk));

    const { data, error: updateError } = await supabase.from("tasks")
      .update({
        title: updates.title,
        raw_input: updates.rawInput,
        urgency_score: urgencyScore
      })
      .eq("id", taskId).eq("user_id", userId).select().single();
      
    if (updateError) {
      setError(updateError.message);
    } else {
      const meta = readTaskMeta(userId);
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

    if (allDone) {
      const store = registerTaskCompleted(userId, taskId);
      setReliabilityStore({ ...store });
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
              // Recalculate reliability
              setReliabilityStore({ ...readReliabilityStore(userId) });
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
      // Recalculate reliability after deletion
      setReliabilityStore({ ...readReliabilityStore(userId) });
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
          writeReliabilityStore(userId, {});
          writeTaskMeta(userId, {});
          setReliabilityStore({});
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
    // Recalculate reliability after AI actions
    setReliabilityStore({ ...readReliabilityStore(userId) });
    return summaries.join("\n") || "Actions completed.";
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
        const store = registerTaskRescheduled(userId, task.id, fromDate, toDate);
        setReliabilityStore({ ...store });
        const meta = readTaskMeta(userId);
        meta[task.id] = { ...meta[task.id], urgencyLabel: "Important" };
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

  return (
    <div className={`min-h-screen ${t.shell}`}>
      <Toaster position="top-right" theme={dark ? "dark" : "light"} />
      <DashboardHeader email={email} fullName={fullName} t={t} onSignOut={handleSignOut} onOpenSettings={setActiveScreen} activeScreen={activeScreen} />

      <div className="relative overflow-hidden">
        <div className="flex transition-transform duration-500 ease-in-out" style={{ width: "200%", transform: activeScreen === "settings" ? "translateX(-50%)" : "translateX(0)" }}>
          <div className="w-1/2 shrink-0">
            <ClickSpark sparkColor="#2563eb" sparkCount={10} duration={400}>
              <main className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 lg:px-8">
                {error && <StatusBanner message={error} dark={dark} onDismiss={() => setError(null)} />}
                <div className={`mb-6 rounded-2xl px-5 py-4 ${t.cardMuted}`}>
                  <p className="text-xs font-bold tracking-wide text-blue-500 uppercase">Welcome back, {firstName}</p>
                  <h2 className={`mt-1 text-xl font-bold sm:text-2xl ${t.textPrimary}`}>Sticker board</h2>
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  <div className="space-y-6 lg:col-span-4">
                    <PanicDump t={t} onSubmit={handleCreateTask} isSubmitting={isSubmitting} selectedDate={selectedDate} />
                    <ConsistencyBoard tasks={tasks} dark={dark} t={t} />
                  </div>
                  <div className="lg:col-span-8">
                    <h2 className={`mb-4 text-sm font-bold ${t.textPrimary}`}>Sticker Matrix</h2>
                    <StickerGrid tasks={tasks} t={t} dark={dark} isLoading={isLoading} deletingTaskId={deletingTaskId} onToggleSubTask={handleToggleSubTask} onDelete={handleDelete} onEdit={handleEditTask} currentTime={currentTime} />
                    <CalendarGrid tasks={tasks} t={t} dark={dark} onDayClick={setSelectedDate} />
                  </div>
                </div>
              </main>
            </ClickSpark>
          </div>
          <div className="w-1/2 shrink-0">
            <SettingsScreen dark={dark} setDark={setDark} t={t} onResetAll={handleResetAll} isResetting={isResetting} dbStatus={dbStatus} uptime={uptime} taskCount={tasks.length} />
          </div>
        </div>
      </div>

      <CustomAlertModal config={alertConfig} onClose={() => setAlertConfig(null)} dark={dark} />

      {activeScreen === "workspace" && (
        <AiAssistantDrawer tasks={tasks} t={t} dark={dark} onExecuteActions={handleExecuteActions} />
      )}
    </div>
  );
}
