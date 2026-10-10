import { useState } from "react";
import { ArrowRight, Loader2, LogIn, UserPlus, UserRound } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { formatSupabaseError, supabase } from "../../lib/supabase";
import StatusBanner from "../../components/ui/StatusBanner";
import AuthLayout from "./AuthLayout";

const COPY = {
  signin: { title: "Welcome back.", subtitle: "Your work is ready when you are.", submit: "Continue to TASKR" },
  signup: { title: "Start with a clear page.", subtitle: "Create your account and make space for momentum.", submit: "Create account" },
  forgot: { title: "Reset your password.", subtitle: "We'll email you a link to choose a new one.", submit: "Send reset link" },
};

const redirectUrl = (path) => `${window.location.origin}${path}`;

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1a11 11 0 0 0-9.82 6.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export default function AuthPage({ mode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(null); // "form" | "google" | "guest"
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(location.state?.notice ?? null);
  const copy = COPY[mode];
  const returnTo = location.state?.from || "/home";

  const run = async (kind, action) => {
    setBusy(kind);
    setError(null);
    setSuccess(null);
    try {
      await action();
    } catch (err) {
      setError(formatSupabaseError(err));
    } finally {
      setBusy(null);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    run("form", async () => {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
        navigate(returnTo, { replace: true });
      } else if (mode === "signup") {
        if (!fullName.trim()) throw new Error("Please enter your full name.");
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() }, emailRedirectTo: redirectUrl("/auth/callback") },
        });
        if (err) throw err;
        if (data.session) navigate("/home", { replace: true });
        else setSuccess("Account created. Check your inbox for a confirmation link, then sign in.");
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectUrl("/auth/reset") });
        if (err) throw err;
        setSuccess("If an account exists for that email, a reset link is on its way.");
      }
    });
  };

  const handleGoogle = () => run("google", async () => {
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl("/auth/callback") },
    });
    if (err) throw err;
  });

  const handleGuest = () => run("guest", async () => {
    const { error: err } = await supabase.auth.signInAnonymously();
    if (err) throw err;
    navigate("/home", { replace: true });
  });

  return (
    <AuthLayout title={copy.title} subtitle={copy.subtitle}>
      {mode !== "forgot" && (
        <div className="auth-toggle">
          <button type="button" onClick={() => navigate("/auth/sign-in", { state: location.state })} className={mode === "signin" ? "is-active" : ""}><LogIn className="h-4 w-4" />Sign in</button>
          <button type="button" onClick={() => navigate("/auth/sign-up", { state: location.state })} className={mode === "signup" ? "is-active" : ""}><UserPlus className="h-4 w-4" />Sign up</button>
        </div>
      )}

      <StatusBanner message={error} onDismiss={() => setError(null)} />
      <StatusBanner message={success} variant="success" onDismiss={() => setSuccess(null)} />

      <form onSubmit={handleSubmit} className="auth-form">
        {mode === "signup" && (
          <label><span>Full name</span><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" autoComplete="name" /></label>
        )}
        <label><span>Email address</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" autoComplete="email" /></label>
        {mode !== "forgot" && (
          <label>
            <span className="flex items-center justify-between">
              Password
              {mode === "signin" && <Link to="/auth/forgot" className="font-semibold text-blue-600 hover:underline">Forgot password?</Link>}
            </span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters" autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          </label>
        )}
        <button type="submit" disabled={Boolean(busy)} className="auth-submit">
          {busy === "form" && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy === "form" ? "Please wait…" : copy.submit}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      {mode === "forgot" ? (
        <p className="auth-legal"><Link to="/auth/sign-in" className="font-semibold text-blue-600 hover:underline">Back to sign in</Link></p>
      ) : (
        <>
          <div className="auth-divider"><span />or<span /></div>
          <div className="grid gap-2">
            <button type="button" onClick={handleGoogle} disabled={Boolean(busy)} className="auth-demo">
              {busy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />} Continue with Google
            </button>
            <button type="button" onClick={handleGuest} disabled={Boolean(busy)} className="auth-demo">
              {busy === "guest" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />} Continue as guest
            </button>
          </div>
          <p className="auth-legal">Guest work is saved to a private account. Add an email in Settings any time to keep it.</p>
        </>
      )}
    </AuthLayout>
  );
}
