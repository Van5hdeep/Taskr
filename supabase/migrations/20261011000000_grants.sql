-- New Supabase projects no longer auto-grant table privileges to the API roles.
-- Signed-in users (including anonymous/guest sessions, which use the
-- `authenticated` role) get table access; RLS still limits them to their own
-- rows. The `anon` (signed-out) role gets nothing.

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.profiles,
  public.boards,
  public.tasks,
  public.fin_accounts,
  public.fin_categories,
  public.fin_transactions,
  public.fin_budgets,
  public.fin_recurring,
  public.fin_goals,
  public.fin_holdings,
  public.fin_holding_snapshots,
  public.documents,
  public.flows,
  public.item_links
to authenticated;

grant select on public.fin_account_balances to authenticated;

grant execute on function
  public.set_updated_at(),
  public.assert_same_owner(regclass, uuid, uuid),
  public.fin_transactions_owner_check(),
  public.tasks_owner_check()
to authenticated;

-- Future tables created by migrations get the same default.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
