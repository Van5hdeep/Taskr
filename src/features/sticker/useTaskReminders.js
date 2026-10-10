import { useEffect, useRef } from "react";
import { toast } from "sonner";

const CHECK_EVERY_MS = 30_000;
const HOUR = 60 * 60 * 1000;

function readSent(key) {
  try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; }
}

function notify(title, body) {
  toast.info(title, { description: body });
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
      new Notification(title, { body, tag: title });
    }
  } catch { /* some browsers only allow notifications from a service worker */ }
}

/**
 * Reminders while the app is open: an explicit remind_at, and a one-hour
 * warning before each deadline. Sent notices are remembered per user so a
 * reload doesn't repeat them.
 */
export function useTaskReminders(tasks, userId) {
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  useEffect(() => {
    if (!userId) return undefined;
    const key = `taskr_reminders_${userId}`;

    const check = () => {
      const now = Date.now();
      const sent = readSent(key);
      let changed = false;
      for (const task of tasksRef.current) {
        if (task.completedAt || task.archivedAt) continue;
        if (task.remindAt) {
          const id = `${task.id}:remind:${task.remindAt.getTime()}`;
          // Skip stale reminders (e.g. set weeks ago while the app was closed).
          if (task.remindAt.getTime() <= now && now - task.remindAt.getTime() < 24 * HOUR && !sent[id]) {
            notify(`Reminder: ${task.title}`, task.deadline ? `Due ${task.deadline.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}` : "");
            sent[id] = now;
            changed = true;
          }
        }
        if (task.deadline) {
          const id = `${task.id}:1h:${task.deadline.getTime()}`;
          const remaining = task.deadline.getTime() - now;
          if (remaining > 0 && remaining <= HOUR && !sent[id]) {
            notify(`1 hour left: ${task.title}`, "Wrap it up!");
            sent[id] = now;
            changed = true;
          }
        }
      }
      if (changed) {
        // Forget entries older than 30 days so the key never grows unbounded.
        const cutoff = now - 30 * 24 * HOUR;
        for (const [id, at] of Object.entries(sent)) if (at < cutoff) delete sent[id];
        try { localStorage.setItem(key, JSON.stringify(sent)); } catch { /* storage full */ }
      }
    };

    check();
    const timer = setInterval(check, CHECK_EVERY_MS);
    return () => clearInterval(timer);
  }, [userId]);
}
