-- Read-only dog card (for viewing another owner's dog after a playdate),
-- owner home location, and feed sorting by distance.

-- Public dog card by id (visible to the owner, or any non-blocked user when the
-- owner is discoverable).
create or replace function public.get_dog_card(p_dog_id uuid)
returns table (
  dog_id uuid, name text, breed text, age int, size text, gender text,
  photo_url text, bio text, owner_id uuid, owner_name text, owner_photo text
)
language sql stable security definer set search_path = public as $$
  select d.id, d.name, d.breed, d.age, d.size, d.gender, d.photo_url, d.bio,
    d.owner_id, p.display_name, p.photo_url
  from public.dogs d join public.profiles p on p.id = d.owner_id
  where d.id = p_dog_id
    and (d.owner_id = auth.uid()
         or (coalesce(p.is_discoverable, true) and not public.is_blocked_with(d.owner_id)));
$$;

-- Owner home location (opt-in, stamped from GPS) for distance-based feed sort.
alter table public.profiles add column if not exists home_location geography(Point, 4326);

create or replace function public.set_home_location(p_lat float8, p_lng float8)
returns void language sql security definer set search_path = public as $$
  update public.profiles
    set home_location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
  where id = auth.uid();
$$;

-- Feed with optional distance from a viewer point; sorts nearest-first when
-- coordinates are supplied, otherwise newest-first.
drop function if exists public.list_feed(integer);
create or replace function public.list_feed(p_limit integer default 50, p_lat float8 default null, p_lng float8 default null)
returns table (post_id uuid, photo_url text, caption text, created_at timestamptz,
  owner_id uuid, owner_name text, owner_photo text, dog_name text,
  reaction_count bigint, my_reaction text, distance_m float8)
language sql stable security definer set search_path = public as $$
  select p.id, p.photo_url, p.caption, p.created_at,
    p.owner_id, pr.display_name, pr.photo_url, d.name,
    (select count(*) from public.post_reactions r where r.post_id = p.id),
    (select r.emoji from public.post_reactions r where r.post_id = p.id and r.user_id = auth.uid()),
    case when p_lat is not null and p_lng is not null and pr.home_location is not null
      then st_distance(pr.home_location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)
      else null end as distance_m
  from public.dog_posts p
  join public.profiles pr on pr.id = p.owner_id
  left join public.dogs d on d.id = p.dog_id
  where not public.is_blocked_with(p.owner_id)
  order by
    case when p_lat is not null and p_lng is not null then
      st_distance(coalesce(pr.home_location, st_setsrid(st_makepoint(0,0),4326)::geography),
                  st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)
    end asc nulls last,
    p.created_at desc
  limit p_limit;
$$;

revoke execute on function public.get_dog_card(uuid) from public;
grant execute on function public.get_dog_card(uuid) to authenticated;
revoke execute on function public.set_home_location(float8, float8) from public;
grant execute on function public.set_home_location(float8, float8) to authenticated;
revoke execute on function public.list_feed(integer, float8, float8) from public;
grant execute on function public.list_feed(integer, float8, float8) to authenticated;
