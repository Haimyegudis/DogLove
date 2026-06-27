-- Show ALL active dogs on the map, including the caller's own dog, so a single
-- user can see their dog walking. (Reverts the own-dog exclusion from 0004.)
create or replace function public.nearby_active_dogs(p_lat float8, p_lng float8, p_radius_m float8)
returns table (
  dog_id uuid, name text, breed text, photo_url text,
  lat float8, lng float8, distance_m float8
) language sql stable as $$
  select d.id, d.name, d.breed, d.photo_url,
    st_y(ws.location::geometry) as lat,
    st_x(ws.location::geometry) as lng,
    st_distance(ws.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_m
  from public.walk_sessions ws
  join public.dogs d on d.id = ws.dog_id
  where ws.is_active = true
    and ws.location is not null
    and st_dwithin(ws.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m)
  order by distance_m asc;
$$;
