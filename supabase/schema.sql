-- Supabase schema for The Last-Minute Life Saver
-- Run this in the Supabase SQL Editor

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  raw_input text not null,
  deadline timestamptz not null,
  urgency_score integer not null check (urgency_score between 1 and 10),
  sub_tasks jsonb not null default '[]'::jsonb,
  is_completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "Users can view own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on public.tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

create index if not exists tasks_user_id_deadline_idx
  on public.tasks (user_id, deadline);
