-- Fix: starting a walk a second time failed with
--   "new row violates row-level security policy (USING expression) for table walk_sessions"
--
-- start_walk upserts (insert ... on conflict (dog_id) do update) and ran as the
-- INVOKER. After a walk ends, is_active is set to false. On the next start, the
-- ON CONFLICT path must read/lock the existing row, but the SELECT policy only
-- exposes rows where is_active = true. The inactive row is therefore invisible
-- to RLS, so the upsert's update is rejected with a USING-expression violation.
--
-- Make start_walk SECURITY DEFINER (mirroring end_walk) and validate ownership
-- explicitly, so the upsert bypasses the is_active-gated SELECT policy while
-- still only ever touching the caller's own dog.

create or replace function public.start_walk(p_dog_id uuid, p_lat float8, p_lng float8)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.dogs d where d.id = p_dog_id and d.owner_id = auth.uid()) then
    raise exception 'not your dog';
  end if;

  insert into public.walk_sessions (dog_id, is_active, location, updated_at, started_at)
  values (p_dog_id, true, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, now(), now())
  on conflict (dog_id) do update
    set is_active = true,
        location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
        updated_at = now(), started_at = now();
end; $$;

revoke execute on function public.start_walk(uuid, float8, float8) from public;
grant execute on function public.start_walk(uuid, float8, float8) to authenticated;
