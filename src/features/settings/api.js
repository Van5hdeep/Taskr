import { supabase } from "../../lib/supabase";

export const PROFILE_DEFAULTS = { display_name: "", currency: "INR", locale: "en-IN", week_starts_on: 1, theme: "system" };

export async function getProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data ?? { id: userId, ...PROFILE_DEFAULTS };
}

export async function updateProfile(userId, patch) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...patch }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}
