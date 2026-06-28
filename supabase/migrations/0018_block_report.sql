-- ===== Safety: block & report =====
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists "blocks_select_own" on public.blocks;
create policy "blocks_select_own" on public.blocks for select using (auth.uid() = blocker_id);
drop policy if exists "blocks_insert_own" on public.blocks;
create policy "blocks_insert_own" on public.blocks for insert with check (auth.uid() = blocker_id);
drop policy if exists "blocks_delete_own" on public.blocks;
create policy "blocks_delete_own" on public.blocks for delete using (auth.uid() = blocker_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports for insert with check (auth.uid() = reporter_id);
drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own" on public.reports for select using (auth.uid() = reporter_id);

-- True if the caller and p_other have blocked each other (either direction).
create or replace function public.is_blocked_with(p_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = p_other)
       or (b.blocker_id = p_other and b.blocked_id = auth.uid())
  );
$$;

-- Recreate discovery RPCs to exclude blocked users (latest bodies + filter).
create or replace function public.browse_dogs(p_limit int default 50)
returns table (dog_id uuid, name text, breed text, age int, photo_url text, owner_id uuid, owner_name text)
language sql stable security definer set search_path = public as $$
  select d.id, d.name, d.breed, d.age, d.photo_url, d.owner_id, p.display_name
  from public.dogs d join public.profiles p on p.id = d.owner_id
  where d.owner_id <> auth.uid() and coalesce(p.is_discoverable, true)
    and not public.is_blocked_with(d.owner_id)
  order by d.created_at desc limit p_limit;
$$;

create or replace function public.search_dogs(p_q text, p_city text default null)
returns table (dog_id uuid, name text, breed text, age int, photo_url text, owner_id uuid, owner_name text, city text)
language sql stable security definer set search_path = public as $$
  select d.id, d.name, d.breed, d.age, d.photo_url, d.owner_id, p.display_name, p.city
  from public.dogs d join public.profiles p on p.id = d.owner_id
  where d.owner_id <> auth.uid() and coalesce(p.is_discoverable, true)
    and not public.is_blocked_with(d.owner_id)
    and (coalesce(p_q, '') = '' or d.breed ilike '%' || p_q || '%' or d.name ilike '%' || p_q || '%')
    and (coalesce(p_city, '') = '' or p.city ilike '%' || p_city || '%')
  order by d.created_at desc limit 100;
$$;

create or replace function public.search_users(p_gender text default null, p_min_age int default 0, p_max_age int default 200, p_city text default null)
returns table (user_id uuid, display_name text, photo_url text, gender text, age int, city text)
language sql stable security definer set search_path = public as $$
  select pr.id, pr.display_name, pr.photo_url, pr.gender,
    extract(year from age(pr.date_of_birth))::int as age, pr.city
  from public.profiles pr
  where pr.id <> auth.uid() and coalesce(pr.is_discoverable, true)
    and not public.is_blocked_with(pr.id)
    and pr.date_of_birth is not null
    and (p_gender is null or pr.gender = p_gender)
    and extract(year from age(pr.date_of_birth))::int between coalesce(p_min_age, 0) and coalesce(p_max_age, 200)
    and (coalesce(p_city, '') = '' or pr.city ilike '%' || p_city || '%')
  order by pr.display_name;
$$;

create or replace function public.nearby_active_dogs(p_lat float8, p_lng float8, p_radius_m float8)
returns table (dog_id uuid, name text, breed text, photo_url text, lat float8, lng float8, distance_m float8)
language sql stable security definer set search_path = public as $$
  select d.id, d.name, d.breed, d.photo_url,
    round(st_y(ws.location::geometry)::numeric, 3)::float8 as lat,
    round(st_x(ws.location::geometry)::numeric, 3)::float8 as lng,
    st_distance(ws.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_m
  from public.walk_sessions ws
  join public.dogs d on d.id = ws.dog_id
  join public.profiles p on p.id = d.owner_id
  where ws.is_active = true and ws.location is not null
    and coalesce(p.is_discoverable, true)
    and not public.is_blocked_with(d.owner_id)
    and st_dwithin(ws.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m)
  order by distance_m asc;
$$;

create or replace function public.list_feed(p_limit int default 50)
returns table (post_id uuid, photo_url text, caption text, created_at timestamptz,
  owner_id uuid, owner_name text, owner_photo text, dog_name text,
  reaction_count bigint, my_reaction text)
language sql stable security definer set search_path = public as $$
  select p.id, p.photo_url, p.caption, p.created_at,
    p.owner_id, pr.display_name, pr.photo_url, d.name,
    (select count(*) from public.post_reactions r where r.post_id = p.id),
    (select r.emoji from public.post_reactions r where r.post_id = p.id and r.user_id = auth.uid())
  from public.dog_posts p
  join public.profiles pr on pr.id = p.owner_id
  left join public.dogs d on d.id = p.dog_id
  where not public.is_blocked_with(p.owner_id)
  order by p.created_at desc limit p_limit;
$$;
