import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
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
        <Link to="/auth/forgot" className="auth-submit">Request a new link <ArrowRight className="h-4 w-4" /></Link>
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
      <form onSubmit={handleSubmit} className="auth-form">
        <label><span>New password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" /></label>
        <label><span>Confirm password</span><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} autoComplete="new-password" /></label>
        <button type="submit" disabled={busy} className="auth-submit">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save password <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </AuthLayout>
  );
}
