import { useEffect, useState } from "react";

interface CountdownResult {
  label: string;
  isCritical: boolean;
  isUrgent: boolean;
}

export function useCountdown(deadline: Date): CountdownResult {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = deadline.getTime() - now;

  if (diff <= 0) {
    return { label: "OVERDUE", isCritical: true, isUrgent: true };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  let label: string;
  if (days > 0) {
    label = `${days}d ${pad(hours)}h ${pad(minutes)}m`;
  } else if (hours > 0) {
    label = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  } else {
    label = `${pad(minutes)}m ${pad(seconds)}s`;
  }

  const isCritical = diff < 2 * 60 * 60 * 1000;
  const isUrgent = diff < 24 * 60 * 60 * 1000;

  return { label, isCritical, isUrgent };
}
