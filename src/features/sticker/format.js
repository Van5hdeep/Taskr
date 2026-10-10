const DAY = 24 * 60 * 60 * 1000;

function dayDiff(date, now) {
  const a = new Date(date); a.setHours(0, 0, 0, 0);
  const b = new Date(now); b.setHours(0, 0, 0, 0);
  return Math.round((a - b) / DAY);
}

/** "Today 5:00 PM", "Tomorrow 9:00 AM", "Fri 9:00 AM", "Oct 24". */
export function formatDue(date, now = Date.now()) {
  if (!date) return "";
  const value = new Date(date);
  const time = value.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const diff = dayDiff(value, now);
  if (diff === 0) return `Today ${time}`;
  if (diff === 1) return `Tomorrow ${time}`;
  if (diff === -1) return `Yesterday ${time}`;
  if (diff > 1 && diff < 7) return `${value.toLocaleDateString(undefined, { weekday: "short" })} ${time}`;
  return value.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(value.getFullYear() !== new Date(now).getFullYear() ? { year: "numeric" } : {}) });
}

/** Value for <input type="datetime-local">. */
export function toLocalInput(date) {
  if (!date) return "";
  const value = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function fromLocalInput(value) {
  return value ? new Date(value) : null;
}
