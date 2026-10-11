import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Loader2, UserRound } from "../../lib/icons";
import { Link, useLocation, useNavigate } from "react-router";
import { formatSupabaseError, supabase } from "../../lib/supabase";
import { setCelebrating } from "../../lib/auth/authTransition";
import StatusBanner from "../../components/ui/StatusBanner";
import AuthLayout, { AuthSuccess } from "./AuthLayout";

const COPY = {
  signin: { kicker: "Welcome back", title: "Sign in to taskr", subtitle: "Your board, money and pages are right where you left them.", submit: "Sign in" },
  signup: { kicker: "Get started — it's free", title: "Create your space", subtitle: "One account for your stickers, finances, notes and flows.", submit: "Create account" },
  forgot: { kicker: "Password help", title: "Reset your password", subtitle: "We'll email you a link to choose a new one.", submit: "Send reset link" },
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
  const [signedIn, setSignedIn] = useState(null); // { name } once auth succeeds
  const copy = COPY[mode];
  const returnTo = location.state?.from || "/home";

  useEffect(() => () => setCelebrating(false), []);

  const run = async (kind, action) => {
    setBusy(kind);
    setError(null);
    setSuccess(null);
    try {
      await action();
    } catch (err) {
      setCelebrating(false);
      setError(formatSupabaseError(err));
    } finally {
      setBusy(null);
    }
  };

  /** Hold the redirect, play the success moment, then slide into the app. */
  const celebrate = (success) => setSignedIn(success);
  const firstName = (name) => name?.trim().split(/\s+/)[0] || "";
  const finish = useCallback(() => {
    navigate(returnTo, { replace: true });
    setCelebrating(false);
  }, [navigate, returnTo]);

  const handleSubmit = (event) => {
    event.preventDefault();
    run("form", async () => {
      if (mode === "signin") {
        setCelebrating(true);
        const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
        const name = firstName(data.user?.user_metadata?.full_name || data.user?.email?.split("@")[0]);
        celebrate({ title: name ? `Welcome back, ${name}` : "Welcome back" });
      } else if (mode === "signup") {
        if (!fullName.trim()) throw new Error("Please enter your full name.");
        setCelebrating(true);
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() }, emailRedirectTo: redirectUrl("/auth/callback") },
        });
        if (err) throw err;
        if (data.session) celebrate({ title: "Account created", detail: `Welcome to taskr, ${firstName(fullName)}. Setting up your space…` });
        else {
          setCelebrating(false);
          setSuccess("Account created. Check your inbox for a confirmation link, then sign in.");
        }
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
    setCelebrating(true);
    const { error: err } = await supabase.auth.signInAnonymously();
    if (err) throw err;
    celebrate({ title: "Welcome to taskr", detail: "You're using a guest account. Setting up your space…" });
  });

  const field = "w-full rounded-xl border border-stone-200 bg-cream-50 px-4 py-3 text-[15px] text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:ring-4 focus:ring-stone-900/5";
  const label = "mb-1.5 block text-sm font-medium text-stone-700";
  const secondary = "inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-800 transition-colors hover:border-stone-300 hover:bg-stone-50 disabled:opacity-60";

  return (
    <AuthLayout kicker={copy.kicker} title={copy.title} subtitle={copy.subtitle}>
      {signedIn && <AuthSuccess title={signedIn.title} detail={signedIn.detail} onDone={finish} />}

      {mode !== "forgot" && (
        <div className="mb-6 grid grid-cols-2 rounded-xl bg-stone-100 p-1 text-sm font-semibold" role="tablist">
          {[["signin", "Sign in", "/auth/sign-in"], ["signup", "Sign up", "/auth/sign-up"]].map(([id, text, to]) => (
            <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => navigate(to, { state: location.state })} className={`rounded-lg py-2 transition-all ${mode === id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}>{text}</button>
          ))}
        </div>
      )}

      <StatusBanner message={error} onDismiss={() => setError(null)} />
      <StatusBanner message={success} variant="success" onDismiss={() => setSuccess(null)} />

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <label className="block"><span className={label}>Full name</span><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" autoComplete="name" className={field} /></label>
        )}
        <label className="block"><span className={label}>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" autoComplete="email" className={field} /></label>
        {mode !== "forgot" && (
          <label className="block">
            <span className={`${label} flex items-center justify-between`}>
              Password
              {mode === "signin" && <Link to="/auth/forgot" className="text-sm font-medium text-stone-500 underline-offset-2 hover:text-stone-900 hover:underline">Forgot?</Link>}
            </span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters" autoComplete={mode === "signin" ? "current-password" : "new-password"} className={field} />
          </label>
        )}
        <button type="submit" disabled={Boolean(busy)} className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-stone-800 disabled:opacity-70">
          {busy === "form" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy === "form" ? "One moment…" : copy.submit}
          {busy !== "form" && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
        </button>
      </form>

      {mode === "forgot" ? (
        <p className="mt-6 text-center text-sm"><Link to="/auth/sign-in" className="font-semibold text-stone-900 hover:underline">Back to sign in</Link></p>
      ) : (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-stone-400"><span className="h-px flex-1 bg-stone-200" />or<span className="h-px flex-1 bg-stone-200" /></div>
          <div className="grid gap-2.5">
            <button type="button" onClick={handleGoogle} disabled={Boolean(busy)} className={secondary}>
              {busy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />} Continue with Google
            </button>
            <button type="button" onClick={handleGuest} disabled={Boolean(busy)} className={secondary}>
              {busy === "guest" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />} Try it as a guest
            </button>
          </div>
          <p className="mt-6 text-center text-xs leading-relaxed text-stone-400">Guest work is saved to a private account. Add an email in Settings any time to keep it.</p>
        </>
      )}
    </AuthLayout>
  );
}
