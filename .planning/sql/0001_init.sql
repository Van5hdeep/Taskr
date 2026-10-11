-- ═══════════════════════════════════════════════════════════════════════════
-- TASKR — initial schema (DRAFT — not applied)
-- Target: supabase/migrations/<timestamp>_init.sql once approved.
-- Applied to the DEV project first. The old public.tasks table is dropped and
-- recreated (its data is not needed). Every other table is new.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Shared helpers ────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─── Profiles ──────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  currency text not null default 'INR',
  locale text not null default 'en-IN',
  week_starts_on smallint not null default 1 check (week_starts_on between 0 and 6),
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  timezone text,
  local_import_done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Back-fill profiles for users that already exist.
insert into public.profiles (id, display_name)
select id, raw_user_meta_data ->> 'full_name' from auth.users
on conflict (id) do nothing;

-- ─── Sticker: boards + tasks ───────────────────────────────────────────────

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default 'My board',
  default_view text not null default 'matrix' check (default_view in ('matrix', 'free', 'list')),
  position integer not null default 0,
  pinned boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing task rows are not needed (decision 2026-10-10): clean reset.
drop table if exists public.tasks cascade;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  board_id uuid not null references public.boards (id) on delete cascade,
  title text not null,
  notes text,
  sub_tasks jsonb not null default '[]'::jsonb, -- [{ id, label, done }]
  is_important boolean not null default false,
  is_urgent boolean not null default false,
  deadline timestamptz,
  remind_at timestamptz,
  recurrence text check (recurrence in ('daily', 'weekdays', 'weekly', 'monthly', 'yearly')),
  color text not null default 'yellow',
  tags text[] not null default '{}',
  pos_x real,
  pos_y real,
  width real,
  height real,
  z_index integer not null default 0,
  sort_order double precision not null default 0,
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Finance ───────────────────────────────────────────────────────────────

create table if not exists public.fin_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('cash', 'bank', 'card', 'wallet', 'loan', 'other')),
  opening_balance numeric(14, 2) not null default 0,
  currency text not null default 'INR',
  is_archived boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fin_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('expense', 'income')),
  color text,
  icon text,
  is_archived boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, kind, name)
);

create table if not exists public.fin_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  target_amount numeric(14, 2) not null check (target_amount > 0),
  target_date date,
  color text,
  achieved_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fin_recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('expense', 'income', 'transfer')),
  amount numeric(14, 2) not null check (amount > 0),
  account_id uuid references public.fin_accounts (id) on delete set null,
  category_id uuid references public.fin_categories (id) on delete set null,
  cadence text not null check (cadence in ('weekly', 'monthly', 'quarterly', 'yearly')),
  interval_count smallint not null default 1 check (interval_count >= 1),
  next_due_on date not null,
  remind_days_before smallint not null default 2,
  is_subscription boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('expense', 'income', 'transfer')),
  amount numeric(14, 2) not null check (amount > 0),
  occurred_on date not null default current_date,
  title text not null,
  notes text,
  account_id uuid not null references public.fin_accounts (id) on delete cascade,
  transfer_account_id uuid references public.fin_accounts (id) on delete cascade,
  category_id uuid references public.fin_categories (id) on delete set null,
  goal_id uuid references public.fin_goals (id) on delete set null,
  recurring_id uuid references public.fin_recurring (id) on delete set null,
  import_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'transfer') = (transfer_account_id is not null))
);

-- CSV re-imports must not duplicate rows.
create unique index if not exists fin_transactions_import_hash_idx
  on public.fin_transactions (user_id, import_hash) where import_hash is not null;

create table if not exists public.fin_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid references public.fin_categories (id) on delete cascade, -- null = overall budget
  amount numeric(14, 2) not null check (amount >= 0),
  rollover boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists fin_budgets_one_per_category
  on public.fin_budgets (user_id, coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.fin_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('mutual_fund', 'stock', 'fd', 'rd', 'gold', 'epf_ppf', 'nps', 'crypto', 'real_estate', 'other')),
  units numeric(18, 6),
  invested_amount numeric(14, 2) not null default 0,
  current_value numeric(14, 2) not null default 0,
  value_updated_on date not null default current_date,
  sip_amount numeric(14, 2),
  sip_day smallint check (sip_day between 1 and 28),
  maturity_date date,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fin_holding_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  holding_id uuid not null references public.fin_holdings (id) on delete cascade,
  value numeric(14, 2) not null,
  as_of date not null default current_date,
  unique (holding_id, as_of)
);

-- Referenced rows must belong to the same user (RLS alone does not prevent
-- pointing a foreign key at another user's id).
create or replace function public.assert_same_owner(tbl regclass, ref uuid, owner uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare found_owner uuid;
begin
  if ref is null then return; end if;
  execute format('select user_id from %s where id = $1', tbl) into found_owner using ref;
  if found_owner is distinct from owner then
    raise exception 'Referenced row % does not belong to this user', ref using errcode = '42501';
  end if;
end $$;

create or replace function public.fin_transactions_owner_check()
returns trigger language plpgsql as $$
begin
  perform public.assert_same_owner('public.fin_accounts', new.account_id, new.user_id);
  perform public.assert_same_owner('public.fin_accounts', new.transfer_account_id, new.user_id);
  perform public.assert_same_owner('public.fin_categories', new.category_id, new.user_id);
  perform public.assert_same_owner('public.fin_goals', new.goal_id, new.user_id);
  perform public.assert_same_owner('public.fin_recurring', new.recurring_id, new.user_id);
  return new;
end $$;

drop trigger if exists fin_transactions_owner on public.fin_transactions;
create trigger fin_transactions_owner before insert or update on public.fin_transactions
  for each row execute function public.fin_transactions_owner_check();

create or replace function public.tasks_owner_check()
returns trigger language plpgsql as $$
begin
  perform public.assert_same_owner('public.boards', new.board_id, new.user_id);
  return new;
end $$;

drop trigger if exists tasks_owner on public.tasks;
create trigger tasks_owner before insert or update on public.tasks
  for each row execute function public.tasks_owner_check();

-- Derived balances (security_invoker so RLS of the caller applies).
create or replace view public.fin_account_balances with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.opening_balance
    + coalesce(sum(case
        when t.kind = 'income' and t.account_id = a.id then t.amount
        when t.kind = 'expense' and t.account_id = a.id then -t.amount
        when t.kind = 'transfer' and t.account_id = a.id then -t.amount
        when t.kind = 'transfer' and t.transfer_account_id = a.id then t.amount
        else 0 end), 0) as balance
from public.fin_accounts a
left join public.fin_transactions t
  on t.account_id = a.id or t.transfer_account_id = a.id
group by a.id;

-- ─── Workspace documents + Flow diagrams ───────────────────────────────────

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default 'Untitled document',
  content jsonb not null default '{"version":2,"pages":[],"blocks":[],"ink":[]}'::jsonb,
  page_style text not null default 'plain' check (page_style in ('plain', 'lined', 'grid', 'dotted')),
  pinned boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.flows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default 'Untitled flow',
  diagram_type text not null default 'blank',
  scene jsonb not null default '{"version":2,"nodes":[],"edges":[]}'::jsonb,
  viewport jsonb,
  pinned boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cross-tool links (phase 6).
create table if not exists public.item_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  from_type text not null check (from_type in ('task', 'document', 'flow', 'flow_node', 'transaction')),
  from_id text not null,
  to_type text not null check (to_type in ('task', 'document', 'flow', 'flow_node', 'transaction')),
  to_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, from_type, from_id, to_type, to_id)
);

-- ─── RLS, owner policies, indexes, updated_at triggers ─────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'boards', 'tasks', 'fin_accounts', 'fin_categories', 'fin_goals', 'fin_recurring',
    'fin_transactions', 'fin_budgets', 'fin_holdings', 'fin_holding_snapshots',
    'documents', 'flows', 'item_links'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists owner_all on public.%I', t);
    execute format(
      'create policy owner_all on public.%I for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);
    execute format('create index if not exists %I on public.%I (user_id)', t || '_user_id_idx', t);
  end loop;

  foreach t in array array[
    'profiles', 'boards', 'tasks', 'fin_accounts', 'fin_goals', 'fin_recurring',
    'fin_transactions', 'fin_budgets', 'fin_holdings', 'documents', 'flows'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create index if not exists tasks_board_idx on public.tasks (board_id, archived_at);
create index if not exists fin_transactions_user_date_idx on public.fin_transactions (user_id, occurred_on desc);
create index if not exists documents_user_updated_idx on public.documents (user_id, updated_at desc);
create index if not exists flows_user_updated_idx on public.flows (user_id, updated_at desc);

-- ─── Storage: private bucket for workspace images ─────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('workspace-assets', 'workspace-assets', false, 10485760,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do nothing;

drop policy if exists "assets_owner_select" on storage.objects;
drop policy if exists "assets_owner_insert" on storage.objects;
drop policy if exists "assets_owner_update" on storage.objects;
drop policy if exists "assets_owner_delete" on storage.objects;

create policy "assets_owner_select" on storage.objects for select to authenticated
  using (bucket_id = 'workspace-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "assets_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'workspace-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "assets_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'workspace-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "assets_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'workspace-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
