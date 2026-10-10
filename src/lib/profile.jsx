import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth/AuthProvider";
import { getProfile, PROFILE_DEFAULTS, updateProfile } from "../features/settings/api";

const ProfileContext = createContext(null);

/** Loads the signed-in user's profile once and shares it (currency, locale, week start…). */
export function ProfileProvider({ children }) {
  const { userId, fullName } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) { setProfile(null); return undefined; }
    let active = true;
    getProfile(userId)
      .then((data) => { if (active) { setProfile(data); setError(null); } })
      .catch((err) => {
        if (!active) return;
        setError(err);
        setProfile({ id: userId, ...PROFILE_DEFAULTS, display_name: fullName });
      });
    return () => { active = false; };
  }, [userId, fullName]);

  const save = useCallback(async (patch) => {
    const saved = await updateProfile(userId, patch);
    setProfile(saved);
    return saved;
  }, [userId]);

  const value = useMemo(() => ({ profile, error, save, ready: Boolean(profile) }), [profile, error, save]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile must be used inside <ProfileProvider>");
  return context;
}

/** Currency formatter bound to the user's currency + locale. */
export function useMoneyFormat() {
  const { profile } = useProfile();
  const currency = profile?.currency || "INR";
  const locale = profile?.locale || "en-IN";
  return useMemo(() => {
    const whole = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 });
    const exact = new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const format = (amount, { exactCents = false } = {}) => {
      const value = Number(amount) || 0;
      return (exactCents || !Number.isInteger(Math.round(value * 100) / 100) ? exact : whole).format(value);
    };
    format.currency = currency;
    format.locale = locale;
    format.symbol = whole.formatToParts(0).find((part) => part.type === "currency")?.value ?? currency;
    return format;
  }, [currency, locale]);
}
