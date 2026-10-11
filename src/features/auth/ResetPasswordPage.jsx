import { useState } from "react";
import { ArrowRight, Loader2 } from "../../lib/icons";
import { Link, useNavigate } from "react-router";
import { formatSupabaseError, supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth/AuthProvider";
import StatusBanner from "../../components/ui/StatusBanner";
import FullScreenLoader from "../../components/ui/FullScreenLoader";
import AuthLayout from "./AuthLayout";

export default function ResetPasswordPage() {
  const { session, loading, clearPasswordRecovery } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (loading) return <FullScreenLoader />;

  if (!session) {
    return (
      <AuthLayout kicker="Password reset" title="This link has expired." subtitle="Reset links work once and only for a short time.">
        <Link to="/auth/forgot" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3.5 text-[15px] font-semibold text-white hover:bg-stone-800 disabled:opacity-70">Request a new link <ArrowRight className="h-4 w-4" /></Link>
      </AuthLayout>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) { setError("The passwords don't match."); return; }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) { setError(formatSupabaseError(err)); return; }
    clearPasswordRecovery();
    navigate("/home", { replace: true });
  };

  return (
    <AuthLayout kicker="Password reset" title="Choose a new password." subtitle={`For ${session.user.email}`}>
      <StatusBanner message={error} onDismiss={() => setError(null)} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block"><span className="text-sm font-medium text-stone-700">New password</span><input className="mt-1.5 w-full rounded-xl border border-stone-200 bg-cream-50 px-4 py-3 text-[15px] text-stone-900 outline-none focus:border-stone-900 focus:bg-white focus:ring-4 focus:ring-stone-900/5" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" /></label>
        <label className="block"><span className="text-sm font-medium text-stone-700">Confirm password</span><input className="mt-1.5 w-full rounded-xl border border-stone-200 bg-cream-50 px-4 py-3 text-[15px] text-stone-900 outline-none focus:border-stone-900 focus:bg-white focus:ring-4 focus:ring-stone-900/5" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} autoComplete="new-password" /></label>
        <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3.5 text-[15px] font-semibold text-white hover:bg-stone-800 disabled:opacity-70">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save password <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </AuthLayout>
  );
}
