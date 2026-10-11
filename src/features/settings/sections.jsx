import { useEffect, useState } from "react";
import { Check, Copy, Download, Loader2, Monitor, Moon, Save, Sun, Trash2 } from "../../lib/icons";
import { toast } from "sonner";
import { useAuth } from "../../lib/auth/AuthProvider";
import { useAppTheme } from "../../lib/theme";
import { useProfile } from "../../lib/profile";
import { formatSupabaseError, supabase } from "../../lib/supabase";
import StatusBanner from "../../components/ui/StatusBanner";
import { clearLocalData, countSavedData, exportAllData, resetAllData } from "./api";
import { buttonDanger, buttonPrimary, buttonSecondary, Fact, Field, inputClass, Panel } from "./ui";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY"];
const WEEK_STARTS = [{ value: 1, label: "Monday" }, { value: 0, label: "Sunday" }, { value: 6, label: "Saturday" }];

// ─── User ──────────────────────────────────────────────────────────────────

export function ProfileSection() {
  const { user, email, isGuest } = useAuth();
  const { profile: savedProfile, save } = useProfile();
  const [profile, setProfile] = useState(savedProfile);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (savedProfile && !profile) setProfile(savedProfile); }, [savedProfile, profile]);
  if (!profile) return <div className="flex min-h-[30vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;

  const name = profile.display_name?.trim() || (isGuest ? "Guest" : email.split("@")[0]);
  const joined = user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "—";

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { display_name: displayName, currency, week_starts_on: weekStartsOn } = profile;
      setProfile(await save({ display_name: displayName?.trim() || null, currency, week_starts_on: Number(weekStartsOn) }));
      if (!isGuest) await supabase.auth.updateUser({ data: { full_name: displayName?.trim() || "" } });
      toast.success("Saved");
    } catch (err) {
      toast.error(formatSupabaseError(err));
    } finally {
      setSaving(false);
    }
  };

  const copyId = async () => {
    try { await navigator.clipboard.writeText(user.id); toast.success("User ID copied"); } catch { toast.error("Couldn't copy"); }
  };

  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-indigo-600 text-xl font-bold text-white">{name.slice(0, 2).toUpperCase()}</span>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-stone-900 dark:text-white">{name}</p>
            <p className="truncate text-sm text-stone-500 dark:text-stone-400">{isGuest ? "Guest account — only on this browser" : email}</p>
          </div>
        </div>
        <div className="mt-5">
          <Fact label="Account type">{isGuest ? "Guest" : "Email"}</Fact>
          <Fact label="Email">{email || "Not added yet"}</Fact>
          <Fact label="Member since">{joined}</Fact>
          <Fact label="User ID">
            <button type="button" onClick={copyId} className="inline-flex items-center gap-1.5 font-mono text-xs text-stone-500 hover:text-stone-900 dark:hover:text-white" title="Copy">
              {user?.id?.slice(0, 8)}… <Copy className="h-3.5 w-3.5" />
            </button>
          </Fact>
        </div>
      </Panel>

      <Panel title="Your details" description="Used across Home, Finance and reminders.">
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name" className="sm:col-span-2">
            <input className={inputClass} value={profile.display_name ?? ""} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} placeholder="Your name" />
          </Field>
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
          <div className="flex justify-end sm:col-span-2">
            <button type="submit" disabled={saving} className={buttonPrimary}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</button>
          </div>
        </form>
      </Panel>
    </div>
  );
}

// ─── Appearance ────────────────────────────────────────────────────────────

const THEMES = [
  { id: "light", label: "Light", icon: Sun, preview: { page: "#ffffff", side: "#f4f4f5", card: "#ffffff", line: "#e4e4e7", ink: "#18181b" } },
  { id: "dark", label: "Dark", icon: Moon, preview: { page: "#0c0c0e", side: "#121215", card: "#18181c", line: "#2a2a30", ink: "#fafafa" } },
  { id: "system", label: "Match system", icon: Monitor, preview: null },
];

function ThemePreview({ colors }) {
  if (!colors) {
    return (
      <div className="grid h-24 grid-cols-2 overflow-hidden rounded-lg ring-1 ring-black/5">
        <ThemePreview colors={THEMES[0].preview} />
        <ThemePreview colors={THEMES[1].preview} />
      </div>
    );
  }
  return (
    <div className="flex h-24 overflow-hidden rounded-lg ring-1 ring-black/5" style={{ background: colors.page }}>
      <div className="w-1/4 space-y-1.5 p-2" style={{ background: colors.side }}>
        {[0, 1, 2].map((i) => <div key={i} className="h-1.5 rounded-full" style={{ background: i === 0 ? "#2563eb" : colors.line }} />)}
      </div>
      <div className="flex-1 space-y-2 p-2.5">
        <div className="h-2 w-1/2 rounded-full" style={{ background: colors.ink, opacity: 0.8 }} />
        <div className="grid grid-cols-2 gap-1.5">
          {[0, 1].map((i) => <div key={i} className="h-9 rounded-md border" style={{ background: colors.card, borderColor: colors.line }} />)}
        </div>
      </div>
    </div>
  );
}

export function AppearanceSection() {
  const { preference, setPreference } = useAppTheme();
  const { save } = useProfile();

  const choose = (id) => {
    setPreference(id);
    save({ theme: id }).catch(() => { /* the choice still applies on this device */ });
  };

  return (
    <Panel title="Theme" description="How taskr looks on this device.">
      <div className="grid gap-4 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
        {THEMES.map(({ id, label, icon: Icon, preview }) => {
          const active = preference === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(id)}
              className={`rounded-2xl border p-3 text-left transition-colors ${active ? "border-amber-500 ring-2 ring-amber-500/20" : "border-stone-200 hover:border-stone-300 dark:border-white/10 dark:hover:border-white/20"}`}
            >
              <ThemePreview colors={preview} />
              <span className="mt-3 flex items-center justify-between text-sm font-semibold text-stone-800 dark:text-stone-100">
                <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4" /> {label}</span>
                {active && <Check className="h-4 w-4 text-amber-700 dark:text-amber-400" />}
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

// ─── Account ───────────────────────────────────────────────────────────────

export function AccountSection() {
  const { email, isGuest } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const run = async (action) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try { await action(); } catch (err) { setError(formatSupabaseError(err)); } finally { setBusy(false); }
  };

  // Anonymous → permanent: set the email first, then the password.
  const upgradeGuest = (event) => {
    event.preventDefault();
    run(async () => {
      const { data, error: emailError } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (emailError) throw emailError;
      if (data.user?.email === newEmail.trim()) {
        const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
        if (passwordError) throw passwordError;
        setMessage("Your account is saved. Sign in with this email from now on.");
        setNewEmail("");
        setNewPassword("");
      } else {
        setMessage("Check your inbox to confirm this email, then come back here to set a password.");
      }
    });
  };

  const linkGoogle = () => run(async () => {
    const { error: linkError } = await supabase.auth.linkIdentity({ provider: "google", options: { redirectTo: `${window.location.origin}/settings/account` } });
    if (linkError) throw linkError;
  });

  const changePassword = (event) => {
    event.preventDefault();
    run(async () => {
      const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
      if (passwordError) throw passwordError;
      setNewPassword("");
      setMessage("Password updated.");
    });
  };

  return (
    <Panel
      title={isGuest ? "Keep your work — save this guest account" : "Sign-in"}
      description={isGuest ? "Add an email and password (or link Google). Everything you've made stays." : `Signed in as ${email}`}
    >
      <StatusBanner message={error} onDismiss={() => setError(null)} />
      <StatusBanner message={message} variant="success" onDismiss={() => setMessage(null)} />
      {isGuest ? (
        <form onSubmit={upgradeGuest} className="grid gap-4 sm:grid-cols-2">
          <Field label="Email"><input type="email" required className={inputClass} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="email" /></Field>
          <Field label="Password"><input type="password" required minLength={6} className={inputClass} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" /></Field>
          <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2">
            <button type="button" onClick={linkGoogle} disabled={busy} className={buttonSecondary}>Link Google instead</button>
            <button type="submit" disabled={busy} className={buttonPrimary}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save account</button>
          </div>
        </form>
      ) : (
        <form onSubmit={changePassword} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="New password" className="flex-1"><input type="password" required minLength={6} className={inputClass} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" /></Field>
          <button type="submit" disabled={busy} className={buttonPrimary}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Change password</button>
        </form>
      )}
    </Panel>
  );
}

// ─── Privacy ───────────────────────────────────────────────────────────────

const PRIVACY_POINTS = [
  ["Only you can see your data", "Everything is stored in your own space in the database. Access rules check every request, so no other account can read or change it."],
  ["No ads, no tracking", "taskr doesn't use analytics, ad trackers or third-party cookies, and nothing you write is sold or shared."],
  ["No AI reads your work", "Your stickers, money, documents and diagrams are never sent to an AI service."],
  ["Pictures stay private", "Images you add to Workspace are kept in private storage and shown through short-lived links."],
  ["This browser remembers a few things", "Your theme, whether the sidebar is collapsed and a short backup of unsaved edits are kept in this browser only."],
];

function downloadJson(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}

export function PrivacySection() {
  const { userId } = useAuth();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      downloadJson(await exportAllData(userId), `taskr-data-${new Date().toISOString().slice(0, 10)}.json`);
      toast.success("Your data is downloading");
    } catch (err) {
      toast.error(formatSupabaseError(err));
    } finally {
      setBusy(false);
    }
  };

  const clearDevice = () => {
    clearLocalData();
    toast.success("Cleared this browser's taskr settings");
  };

  return (
    <div className="space-y-6">
      <Panel title="How your data is handled">
        <ul className="space-y-4">
          {PRIVACY_POINTS.map(([title, body]) => (
            <li key={title} className="flex gap-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
              <div>
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</p>
                <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Your data" description="Take a copy with you, or tidy up this browser.">
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={download} disabled={busy} className={buttonPrimary}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download my data</button>
          <button type="button" onClick={clearDevice} className={buttonSecondary}>Clear this browser's settings</button>
        </div>
        <p className="mt-3 text-xs text-stone-400">Clearing the browser only resets things like the theme here. Your saved work isn't touched.</p>
      </Panel>
    </div>
  );
}

// ─── Reset ─────────────────────────────────────────────────────────────────

const CONFIRM_WORD = "RESET";

export function ResetSection() {
  const { userId } = useAuth();
  const { save } = useProfile();
  const [counts, setCounts] = useState(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    countSavedData(userId).then(setCounts).catch(() => setCounts(null));
  }, [userId, done]);

  const reset = async (event) => {
    event.preventDefault();
    if (typed !== CONFIRM_WORD) return;
    setBusy(true);
    try {
      await resetAllData(userId);
      clearLocalData();
      await save({}).catch(() => {});
      setTyped("");
      setDone(true);
      toast.success("Everything has been deleted. Fresh start.");
    } catch (err) {
      toast.error(formatSupabaseError(err, "The reset didn't finish. Some data may remain — try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel tone="danger" title="Reset taskr" description="Delete everything you've saved and start from a clean slate.">
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
        <p className="font-bold">This permanently deletes:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>All stickers{counts ? ` (${counts.stickers})` : ""}</li>
          <li>All finance data: accounts, transactions{counts ? ` (${counts.transactions})` : ""}, budgets, bills, goals and investments</li>
          <li>All Workspace documents{counts ? ` (${counts.documents})` : ""} and their images</li>
          <li>All Flow diagrams{counts ? ` (${counts.flows})` : ""}</li>
        </ul>
        <p className="mt-3">Your sign-in stays, so you can keep using taskr. <strong>This can't be undone</strong> — download your data from Privacy first if you might want it.</p>
      </div>
      <form onSubmit={reset} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label={`Type ${CONFIRM_WORD} to confirm`} className="flex-1">
          <input className={inputClass} value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase())} placeholder={CONFIRM_WORD} autoComplete="off" />
        </Field>
        <button type="submit" disabled={typed !== CONFIRM_WORD || busy} className={buttonDanger}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete everything
        </button>
      </form>
    </Panel>
  );
}
