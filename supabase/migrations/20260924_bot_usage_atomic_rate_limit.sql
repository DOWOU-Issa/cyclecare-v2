-- Déjà appliquée sur le projet dszfylxtvytuwtvrpger (24/09/2026).
-- Compteur atomique : impossible de dépasser la limite avec des requêtes en parallèle
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
  return coalesce(v_count, -1);  -- -1 = limite atteinte
end;
$$;

revoke all on function public.increment_bot_usage() from public, anon;
grant execute on function public.increment_bot_usage() to authenticated;

-- Les utilisatrices ne peuvent plus modifier elles-mêmes leur compteur (lecture seule)
drop policy if exists "bot_usage_insert_own" on public.bot_usage;
drop policy if exists "bot_usage_update_own" on public.bot_usage;
drop policy if exists "bot_usage_delete_own" on public.bot_usage;
drop policy if exists "Insert bot_usage propre" on public.bot_usage;
drop policy if exists "Update bot_usage propre" on public.bot_usage;
drop policy if exists "Delete bot_usage propre" on public.bot_usage;
drop policy if exists "Lecture bot_usage propre" on public.bot_usage;
