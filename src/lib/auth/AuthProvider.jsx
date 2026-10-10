import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession()
      .then(({ data }) => { if (mounted) setSession(data.session); })
      .catch(() => { if (mounted) setSession(null); })
      .finally(() => { if (mounted) setLoading(false); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
      setSession(nextSession);
      setLoading(false);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    setSession(null);
    return { error };
  }, []);

  const value = useMemo(() => {
    const user = session?.user ?? null;
    const fullName = user?.user_metadata?.full_name ?? "";
    const email = user?.email ?? "";
    return {
      session,
      user,
      userId: user?.id ?? null,
      email,
      fullName,
      displayName: fullName.trim().split(/\s+/)[0] || email.split("@")[0] || (user?.is_anonymous ? "Guest" : "there"),
      isGuest: Boolean(user?.is_anonymous),
      loading,
      isPasswordRecovery,
      clearPasswordRecovery: () => setIsPasswordRecovery(false),
      signOut,
    };
  }, [session, loading, isPasswordRecovery, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
