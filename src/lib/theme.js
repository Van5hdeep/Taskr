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
      shell: dark ? "bg-ink-950 text-stone-100" : "bg-cream-50 text-stone-900",
      card: dark
        ? "bg-ink-850 border border-white/[0.07] shadow-lg shadow-black/30"
        : "bg-white border border-stone-100 shadow-sm",
      cardMuted: dark ? "bg-ink-900 border border-white/[0.06]" : "bg-stone-50 border border-stone-100",
      input: dark
        ? "border-white/10 bg-ink-850 text-stone-100 placeholder:text-stone-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/25"
        : "border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100",
      textPrimary: dark ? "text-stone-50" : "text-stone-900",
      textMuted: dark ? "text-stone-400" : "text-stone-500",
      dropdown: dark ? "border-white/10 bg-ink-850 shadow-black/50" : "border-stone-100 bg-white shadow-stone-200/70",
      profileBtn: dark ? "border-white/10 bg-ink-850 hover:border-white/20" : "border-stone-100 bg-white hover:border-amber-200",
      navBtn: dark ? "border-white/10 text-stone-300 hover:bg-ink-850" : "border-stone-100 text-stone-600 hover:bg-stone-50",
      authToggle: dark ? "border-white/[0.07] bg-ink-900" : "border-stone-100 bg-stone-50",
    }),
    [dark]
  );
}
