-- Location-aware dog-walkers: store an opt-in walker location and search by radius.

alter table public.profiles add column if not exists walker_location geography(Point, 4326);

-- Toggle walker mode and (optionally) stamp the walker's location in one call.
-- Passing null lat/lng leaves the existing location untouched when turning on,
-- and turning off clears nothing but the flag.
create or replace function public.set_walker(p_on boolean, p_lat float8 default null, p_lng float8 default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
    set is_walker = p_on,
        walker_location = case
          when p_lat is not null and p_lng is not null
            then st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
          else walker_location
        end
  where id = auth.uid();
end; $$;

-- Walkers within p_radius_m of a chosen point, nearest first, with rating.
create or replace function public.nearby_walkers(p_lat float8, p_lng float8, p_radius_m float8 default 5000)
returns table (
  user_id uuid, display_name text, photo_url text, city text,
  avg_stars numeric, rating_count bigint, distance_m float8
)
language sql stable security definer set search_path = public as $$
  select pr.id, pr.display_name, pr.photo_url, pr.city,
    (select round(coalesce(avg(stars), 0), 1) from public.user_ratings r where r.rated_id = pr.id),
    (select count(*) from public.user_ratings r where r.rated_id = pr.id),
    st_distance(pr.walker_location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_m
  from public.profiles pr
  where pr.id <> auth.uid()
    and pr.is_walker = true
    and pr.walker_location is not null
    and coalesce(pr.is_discoverable, true)
    and not public.is_blocked_with(pr.id)
    and st_dwithin(pr.walker_location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m)
  order by distance_m asc
  limit 100;
$$;

revoke execute on function public.set_walker(boolean, float8, float8) from public;
grant execute on function public.set_walker(boolean, float8, float8) to authenticated;
revoke execute on function public.nearby_walkers(float8, float8, float8) from public;
grant execute on function public.nearby_walkers(float8, float8, float8) to authenticated;
