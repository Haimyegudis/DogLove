-- Active-walkers list for the home "active walkers" stat card.
-- Mirrors nearby_active_dogs filters (discoverable + not blocked) but is global
-- (no radius) and includes owner info + how long they've been walking.
-- Coordinates are coarsened to ~110m like nearby_active_dogs.

create or replace function public.list_active_walkers()
returns table (
  dog_id uuid, name text, breed text, photo_url text,
  owner_id uuid, owner_name text, city text,
  lat float8, lng float8, started_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select d.id, d.name, d.breed, d.photo_url,
    p.id, p.display_name, p.city,
    round(st_y(ws.location::geometry)::numeric, 3)::float8,
    round(st_x(ws.location::geometry)::numeric, 3)::float8,
    ws.started_at
  from public.walk_sessions ws
  join public.dogs d on d.id = ws.dog_id
  join public.profiles p on p.id = d.owner_id
  where ws.is_active = true
    and coalesce(p.is_discoverable, true)
    and not public.is_blocked_with(d.owner_id)
  order by ws.started_at desc nulls last
  limit 200;
$$;

revoke execute on function public.list_active_walkers() from public;
grant execute on function public.list_active_walkers() to authenticated;
