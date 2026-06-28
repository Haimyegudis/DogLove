-- Fix: live "nearby dog" updates never reached other users.
--
-- Realtime postgres_changes authorizes each event by evaluating the table's
-- SELECT policy AS THE SUBSCRIBING USER, with RLS active. The previous
-- walk_sessions SELECT policy contained an EXISTS over public.profiles, but
-- profiles_select_own restricts SELECT to auth.uid() = id. So when user B's
-- client evaluated the policy for user A's walk_session row, the profiles
-- subquery saw nothing, EXISTS was false, and Realtime silently dropped the
-- event. Manual refresh still worked because nearbyDogs() is SECURITY DEFINER
-- and bypasses RLS — which is exactly why the dog only appeared after a manual
-- action (e.g. the other user starting their own walk), never live.
--
-- Wrapping the discoverability check in a SECURITY DEFINER helper lets the
-- policy be satisfied for any authenticated subscriber without granting direct
-- cross-user reads on profiles. Non-discoverable owners still evaluate to false,
-- so their walks stay invisible.

create or replace function public.dog_owner_discoverable(p_dog_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.dogs d
    join public.profiles p on p.id = d.owner_id
    where d.id = p_dog_id and coalesce(p.is_discoverable, true)
  );
$$;

revoke execute on function public.dog_owner_discoverable(uuid) from public;
grant execute on function public.dog_owner_discoverable(uuid) to authenticated;

drop policy if exists "ws_select_active_discoverable" on public.walk_sessions;
create policy "ws_select_active_discoverable" on public.walk_sessions
  for select using (is_active = true and public.dog_owner_discoverable(dog_id));
