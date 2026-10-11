import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../lib/auth/AuthProvider";
import FullScreenLoader from "../../components/ui/FullScreenLoader";
import { AuthSuccess } from "./AuthLayout";

/**
 * Landing route for Google and email-confirmation redirects. supabase-js
 * exchanges the ?code= automatically (detectSessionInUrl); this page waits
 * for the session, plays the welcome moment, or surfaces the provider's error.
 */
export default function AuthCallbackPage() {
  const { session, loading, fullName } = useAuth();
  const navigate = useNavigate();
  const [error] = useState(() => {
    const params = new URLSearchParams(`${window.location.search.slice(1)}&${window.location.hash.slice(1)}`);
    return params.get("error_description") || params.get("error");
  });

  useEffect(() => {
    if (session) return undefined;
    // Give the code exchange a moment; then fall back to sign-in.
    const timer = setTimeout(() => navigate("/auth/sign-in", { replace: true }), error ? 4000 : 8000);
    return () => clearTimeout(timer);
  }, [error, navigate, session]);

  const goHome = useCallback(() => navigate("/home", { replace: true }), [navigate]);

  if (error) return <FullScreenLoader label={`Sign-in failed: ${error}. Returning to sign in…`} />;
  if (!loading && session) {
    const name = (fullName || session.user?.user_metadata?.name || "").trim().split(/\s+/)[0];
    return (
      <>
        <FullScreenLoader label="Signing you in…" />
        <AuthSuccess title={name ? `Welcome, ${name}` : "Welcome to taskr"} onDone={goHome} />
      </>
    );
  }
  return <FullScreenLoader label="Finishing sign-in…" />;
}
