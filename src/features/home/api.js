import { addMonths } from "date-fns";
import { supabase } from "../../lib/supabase";
import { listOpenTasks } from "../sticker/api";
import { monthRange } from "../finance/calc";

async function rows(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Everything Home needs, fetched in parallel. Each section fails independently. */
export async function loadHome() {
  const since = monthRange(addMonths(new Date(), -1)).start; // last month too, for budget rollover
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const [tasks, boards, transactions, recurring, goals, budgets, documents, flows, doneToday] = await Promise.allSettled([
    listOpenTasks(),
    rows(supabase.from("boards").select("id, name, updated_at").is("archived_at", null)),
    rows(supabase.from("fin_transactions").select("id, kind, amount, occurred_on, goal_id, category_id, title").or(`occurred_on.gte.${since},goal_id.not.is.null`)),
    rows(supabase.from("fin_recurring").select("*").eq("is_active", true).order("next_due_on")),
    rows(supabase.from("fin_goals").select("*").is("archived_at", null)),
    rows(supabase.from("fin_budgets").select("*")),
    rows(supabase.from("documents").select("id, title, updated_at, pinned").is("archived_at", null).order("updated_at", { ascending: false }).limit(6)),
    rows(supabase.from("flows").select("id, title, updated_at, pinned").is("archived_at", null).order("updated_at", { ascending: false }).limit(6)),
    rows(supabase.from("tasks").select("id").gte("completed_at", startOfToday.toISOString())),
  ]);
  const value = (result) => (result.status === "fulfilled" ? result.value : null);
  return {
    tasks: value(tasks),
    boards: value(boards) ?? [],
    finance: transactions.status === "fulfilled" && recurring.status === "fulfilled"
      ? { transactions: value(transactions), recurring: value(recurring), goals: value(goals) ?? [], budgets: value(budgets) ?? [] }
      : null,
    documents: value(documents) ?? [],
    flows: value(flows) ?? [],
    doneToday: value(doneToday)?.length ?? 0,
    errors: [tasks, transactions, documents].filter((result) => result.status === "rejected").map((result) => result.reason),
  };
}
