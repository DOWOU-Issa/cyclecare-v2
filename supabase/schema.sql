-- =============================================
-- CycleCare — schéma complet de la base Supabase
-- =============================================
-- Reflète l'état du projet de production (v2.2.0).
-- À exécuter dans Supabase > SQL Editor sur un projet NEUF.
-- Le script est ré-exécutable (if not exists / or replace).
-- =============================================

-- ---------- Données de l'utilisatrice (une ligne par compte) ----------
create table if not exists public.user_data (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  name          text not null default '',
  email         text,
  avatar_color  text,
  cycle_len     integer not null default 28,
  period_dur    integer not null default 5,
  periods       jsonb not null default '[]'::jsonb,
  rapports      jsonb not null default '[]'::jsonb,
  symptoms      jsonb not null default '[]'::jsonb,
  medications   jsonb not null default '[]'::jsonb,
  moods         jsonb,
  energies      jsonb,
  temperatures  jsonb,
  weights       jsonb,
  thoughts      jsonb,
  discharge     jsonb,
  period_delays jsonb,
  dark_mode     boolean,
  notif_prefs   jsonb default '{"enabled": false, "pillHour": 20, "pillReminder": false, "lastFiredDate": null}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- updated_at mis à jour automatiquement (sert à détecter les modifications
-- faites depuis un autre appareil lors de la synchronisation)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_data_updated_at on public.user_data;
create trigger trg_user_data_updated_at
  before update on public.user_data
  for each row execute function public.set_updated_at();

-- Chaque utilisatrice ne voit et ne modifie QUE sa propre ligne
alter table public.user_data enable row level security;

drop policy if exists "Lecture données propres" on public.user_data;
create policy "Lecture données propres" on public.user_data
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Insertion données propres" on public.user_data;
create policy "Insertion données propres" on public.user_data
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Mise à jour données propres" on public.user_data;
create policy "Mise à jour données propres" on public.user_data
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Suppression données propres" on public.user_data;
create policy "Suppression données propres" on public.user_data
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------- Compteur de l'assistante IA (50 questions / jour) ----------
create table if not exists public.bot_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  date    date not null,
  count   integer not null default 0,
  primary key (user_id, date)
);

alter table public.bot_usage enable row level security;

-- Lecture seule pour l'utilisatrice : seul increment_bot_usage() écrit
drop policy if exists "bot_usage_select_own" on public.bot_usage;
create policy "bot_usage_select_own" on public.bot_usage
  for select to authenticated using (user_id = (select auth.uid()));

-- Incrément ATOMIQUE : impossible de dépasser la limite avec des requêtes
-- en parallèle. Retourne le nouveau compteur, ou -1 si la limite est atteinte.
create or replace function public.increment_bot_usage()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit constant integer := 50;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  insert into public.bot_usage as b (user_id, date, count)
  values (v_uid, current_date, 1)
  on conflict (user_id, date)
  do update set count = b.count + 1
  where b.count < v_limit
  returning b.count into v_count;
  return coalesce(v_count, -1);
end;
$$;

revoke all on function public.increment_bot_usage() from public, anon;
grant execute on function public.increment_bot_usage() to authenticated;
