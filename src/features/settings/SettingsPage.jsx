import { useEffect, useState } from "react";
import { KeyRound, Loader2, Save, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { usePageContext } from "../../app/usePageContext";
import { useAuth } from "../../lib/auth/AuthProvider";
import { formatSupabaseError, supabase } from "../../lib/supabase";
import StatusBanner from "../../components/ui/StatusBanner";
import { useProfile } from "../../lib/profile";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY"];
const WEEK_STARTS = [{ value: 1, label: "Monday" }, { value: 0, label: "Sunday" }, { value: 6, label: "Saturday" }];

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-blue-500/15 dark:bg-[#121a3a]">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-300"><Icon className="h-4 w-4" /></span>
        <div>
          <h2 className="font-bold text-slate-900 dark:text-white">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export default function SettingsPage() {
  const { t, theme } = usePageContext();
  const { email, isGuest } = useAuth();
  const { profile: savedProfile, error: profileError, save } = useProfile();
  const [profile, setProfile] = useState(savedProfile);
  const [loadError, setLoadError] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountMessage, setAccountMessage] = useState(null);
  const [accountError, setAccountError] = useState(null);

  useEffect(() => {
    if (savedProfile && !profile) setProfile(savedProfile);
  }, [savedProfile, profile]);

  useEffect(() => {
    if (profileError) setLoadError(formatSupabaseError(profileError));
  }, [profileError]);

  const inputClass = `w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none ${t.input}`;

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const { display_name: displayName, currency, week_starts_on: weekStartsOn } = profile;
      const saved = await save({ display_name: displayName?.trim() || null, currency, week_starts_on: Number(weekStartsOn), theme: theme.preference });
      setProfile(saved);
      if (!isGuest) await supabase.auth.updateUser({ data: { full_name: displayName?.trim() || "" } });
      setLoadError(null);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(formatSupabaseError(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const runAccountAction = async (action) => {
    setAccountBusy(true);
    setAccountError(null);
    setAccountMessage(null);
    try {
      await action();
    } catch (err) {
      setAccountError(formatSupabaseError(err));
    } finally {
      setAccountBusy(false);
    }
  };

  // Anonymous → permanent: set the email first, then the password.
  const upgradeGuest = (event) => {
    event.preventDefault();
    runAccountAction(async () => {
      const { data, error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      if (data.user?.email === newEmail.trim()) {
        const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
        if (passwordError) throw passwordError;
        setAccountMessage("Your account is saved. Sign in with this email from now on.");
        setNewEmail("");
        setNewPassword("");
      } else {
        setAccountMessage("Check your inbox to confirm this email, then come back here to set a password.");
      }
    });
  };

  const linkGoogle = () => runAccountAction(async () => {
    const { error } = await supabase.auth.linkIdentity({ provider: "google", options: { redirectTo: `${window.location.origin}/settings` } });
    if (error) throw error;
  });

  const changePassword = (event) => {
    event.preventDefault();
    runAccountAction(async () => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setAccountMessage("Password updated.");
    });
  };

  if (!profile) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>;
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 pb-28 sm:px-6">
      <header>
        <h1 className={`text-2xl font-extrabold tracking-tight ${t.textPrimary}`}>Settings</h1>
        <p className={`mt-1 text-sm ${t.textMuted}`}>Your profile, preferences and account.</p>
      </header>

      <StatusBanner message={loadError} variant="info" onDismiss={() => setLoadError(null)} />

      <Section icon={UserRound} title="Profile & preferences" description="Used across Home, Finance and reminders.">
        <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Display name">
              <input className={inputClass} value={profile.display_name ?? ""} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} placeholder="Your name" />
            </Field>
          </div>
          <Field label="Currency">
            <select className={inputClass} value={profile.currency} onChange={(e) => setProfile({ ...profile, currency: e.target.value })}>
              {CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
          </Field>
          <Field label="Week starts on">
            <select className={inputClass} value={profile.week_starts_on} onChange={(e) => setProfile({ ...profile, week_starts_on: Number(e.target.value) })}>
              {WEEK_STARTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="Theme">
            <select className={inputClass} value={theme.preference} onChange={(e) => theme.setPreference(e.target.value)}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">Match system</option>
            </select>
          </Field>
          <div className="flex items-end justify-end sm:col-span-2">
            <button type="submit" disabled={savingProfile} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save preferences
            </button>
          </div>
        </form>
      </Section>

      <Section
        icon={isGuest ? ShieldCheck : KeyRound}
        title={isGuest ? "Keep your work — save this guest account" : "Account"}
        description={isGuest ? "Add an email and password (or link Google). Everything you've made stays." : `Signed in as ${email}`}
      >
        <StatusBanner message={accountError} onDismiss={() => setAccountError(null)} />
        <StatusBanner message={accountMessage} variant="success" onDismiss={() => setAccountMessage(null)} />
        {isGuest ? (
          <form onSubmit={upgradeGuest} className="grid gap-4 sm:grid-cols-2">
            <Field label="Email"><input type="email" required className={inputClass} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="email" /></Field>
            <Field label="Password"><input type="password" required minLength={6} className={inputClass} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" /></Field>
            <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2">
              <button type="button" onClick={linkGoogle} disabled={accountBusy} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">Link Google instead</button>
              <button type="submit" disabled={accountBusy} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                {accountBusy && <Loader2 className="h-4 w-4 animate-spin" />} Save account
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={changePassword} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1"><Field label="New password"><input type="password" required minLength={6} className={inputClass} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" /></Field></div>
            <button type="submit" disabled={accountBusy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
              {accountBusy && <Loader2 className="h-4 w-4 animate-spin" />} Change password
            </button>
          </form>
        )}
      </Section>
    </main>
  );
}
