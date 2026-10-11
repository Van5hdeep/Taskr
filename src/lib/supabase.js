import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
// Publishable keys replace the legacy anon key; the fallback keeps older .env files working.
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

if (!isSupabaseConfigured) {
  console.error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env and restart the dev server.");
}

export const supabase = createClient(url || "http://localhost", key || "missing-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

export function formatSupabaseError(error, fallback = "Something went wrong.") {
  const message = String(error?.message || error || fallback);
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "Cannot reach Supabase. Check your connection and that VITE_SUPABASE_URL points to a live project.";
  }
  if (/anonymous sign-ins are disabled/i.test(message)) {
    return "Guest mode is turned off for this project. Enable anonymous sign-ins in Supabase → Authentication → Sign In / Providers.";
  }
  if (/provider is not enabled|unsupported provider/i.test(message)) {
    return "Google sign-in isn't enabled yet. Enable the Google provider in Supabase → Authentication → Sign In / Providers.";
  }
  if (/relation .* does not exist|could not find the table/i.test(message)) {
    return "The database tables haven't been created yet. Apply the Supabase migrations (npx supabase db push).";
  }
  return message;
}
