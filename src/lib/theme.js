import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";

const THEME_KEY = "taskr_theme";

function readStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return ["light", "dark", "system"].includes(value) ? value : "light";
  } catch {
    return "light";
  }
}

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

/** Theme preference (light | dark | system) and the resolved `dark` flag. */
export function useThemePreference() {
  const [preference, setPreferenceState] = useState(readStoredTheme);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!query) return undefined;
    const onChange = (event) => setSystemDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const dark = preference === "dark" || (preference === "system" && systemDark);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const setPreference = useCallback((value) => {
    setPreferenceState(value);
    try { localStorage.setItem(THEME_KEY, value); } catch { /* preference stays in memory */ }
  }, []);

  return useMemo(() => ({ preference, setPreference, dark }), [preference, setPreference, dark]);
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const theme = useThemePreference();
  return createElement(ThemeContext.Provider, { value: theme }, children);
}

/** { preference, setPreference, dark } */
export function useAppTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useAppTheme must be used inside <ThemeProvider>");
  return theme;
}

/** Tailwind class tokens shared by the existing screens. */
export function useTheme(dark) {
  return useMemo(
    () => ({
      shell: dark ? "bg-[#0a0f24] text-slate-100" : "bg-white text-zinc-900",
      card: dark
        ? "bg-[#161f42]/80 backdrop-blur-sm border border-blue-500/20 shadow-lg shadow-blue-900/20"
        : "bg-white border border-zinc-100 shadow-sm",
      cardMuted: dark ? "bg-[#0d1530]/90 border border-blue-500/15" : "bg-zinc-50 border border-zinc-100",
      input: dark
        ? "border-blue-500/20 bg-[#161f42]/60 text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
        : "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100",
      textPrimary: dark ? "text-white" : "text-zinc-900",
      textMuted: dark ? "text-slate-400" : "text-zinc-500",
      dropdown: dark ? "border-blue-500/20 bg-[#161f42]/95 shadow-black/50" : "border-zinc-100 bg-white shadow-zinc-200/70",
      profileBtn: dark ? "border-blue-500/20 bg-[#161f42]/80 hover:border-blue-400/40" : "border-zinc-100 bg-white hover:border-blue-200",
      navBtn: dark ? "border-blue-500/20 text-slate-300 hover:bg-[#161f42]/80" : "border-zinc-100 text-zinc-600 hover:bg-zinc-50",
      authToggle: dark ? "border-blue-500/15 bg-[#0d1530]/90" : "border-zinc-100 bg-zinc-50",
    }),
    [dark]
  );
}
