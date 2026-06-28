-- Audit fixes: missing spatial/FK indexes + remove per-row correlated subqueries.

create index if not exists profiles_walker_loc_idx on public.profiles using gist (walker_location);
create index if not exists profiles_home_loc_idx on public.profiles using gist (home_location);
create index if not exists lost_dogs_loc_idx on public.lost_dogs using gist (location);
create index if not exists events_loc_idx on public.events using gist (location);
create index if not exists user_ratings_rated_idx on public.user_ratings (rated_id);
create index if not exists post_reactions_post_idx on public.post_reactions (post_id);

-- available_walkers: ratings via a single lateral instead of two per-row subqueries.
create or replace function public.available_walkers(p_city text default null)
returns table (user_id uuid, display_name text, photo_url text, city text, avg_stars numeric, rating_count bigint)
language sql stable security definer set search_path = public as $$
  select pr.id, pr.display_name, pr.photo_url, pr.city, rt.avg_stars, rt.rating_count
  from public.profiles pr
  left join lateral (
    select round(coalesce(avg(r.stars), 0), 1) as avg_stars, count(*) as rating_count
    from public.user_ratings r where r.rated_id = pr.id
  ) rt on true
  where pr.id <> auth.uid() and pr.is_walker = true
    and coalesce(pr.is_discoverable, true)
    and not public.is_blocked_with(pr.id)
    and (coalesce(p_city, '') = '' or pr.city ilike '%' || p_city || '%')
  order by pr.display_name;
$$;

-- nearby_walkers: same lateral, keep distance sort.
create or replace function public.nearby_walkers(p_lat float8, p_lng float8, p_radius_m float8 default 5000)
returns table (user_id uuid, display_name text, photo_url text, city text,
  avg_stars numeric, rating_count bigint, distance_m float8)
language sql stable security definer set search_path = public as $$
  select pr.id, pr.display_name, pr.photo_url, pr.city, rt.avg_stars, rt.rating_count,
    st_distance(pr.walker_location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_m
  from public.profiles pr
  left join lateral (
    select round(coalesce(avg(r.stars), 0), 1) as avg_stars, count(*) as rating_count
    from public.user_ratings r where r.rated_id = pr.id
  ) rt on true
  where pr.id <> auth.uid() and pr.is_walker = true and pr.walker_location is not null
    and coalesce(pr.is_discoverable, true)
    and not public.is_blocked_with(pr.id)
    and st_dwithin(pr.walker_location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m)
  order by distance_m asc
  limit 100;
$$;

-- list_feed: reactions via laterals; nulls-last distance sort (no coalesce wrap).
create or replace function public.list_feed(p_limit integer default 50, p_lat float8 default null, p_lng float8 default null)
returns table (post_id uuid, photo_url text, caption text, created_at timestamptz,
  owner_id uuid, owner_name text, owner_photo text, dog_name text,
  reaction_count bigint, my_reaction text, distance_m float8)
language sql stable security definer set search_path = public as $$
  select p.id, p.photo_url, p.caption, p.created_at,
    p.owner_id, pr.display_name, pr.photo_url, d.name,
    rc.cnt, mr.emoji,
    case when p_lat is not null and p_lng is not null and pr.home_location is not null
      then st_distance(pr.home_location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)
      else null end as distance_m
  from public.dog_posts p
  join public.profiles pr on pr.id = p.owner_id
  left join public.dogs d on d.id = p.dog_id
  left join lateral (select count(*) as cnt from public.post_reactions r where r.post_id = p.id) rc on true
  left join lateral (select r.emoji from public.post_reactions r where r.post_id = p.id and r.user_id = auth.uid()) mr on true
  where not public.is_blocked_with(p.owner_id)
  order by
    case when p_lat is not null and p_lng is not null and pr.home_location is not null
      then st_distance(pr.home_location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)
    end asc nulls last,
    p.created_at desc
  limit p_limit;
$$;

revoke execute on function public.available_walkers(text) from public;
grant execute on function public.available_walkers(text) to authenticated;
revoke execute on function public.nearby_walkers(float8, float8, float8) from public;
grant execute on function public.nearby_walkers(float8, float8, float8) to authenticated;
revoke execute on function public.list_feed(integer, float8, float8) from public;
grant execute on function public.list_feed(integer, float8, float8) to authenticated;
