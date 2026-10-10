import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "../../lib/auth/AuthProvider";
import FullScreenLoader from "../../components/ui/FullScreenLoader";

/**
 * Landing route for OAuth and email-confirmation redirects. supabase-js
 * exchanges the ?code= automatically (detectSessionInUrl); this page waits
 * for the session, or surfaces the provider's error.
 */
export default function AuthCallbackPage() {
  const { session, loading } = useAuth();
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

  if (error) return <FullScreenLoader label={`Sign-in failed: ${error}. Returning to sign in…`} />;
  if (!loading && session) return <Navigate to="/home" replace />;
  return <FullScreenLoader label="Finishing sign-in…" />;
}
