create extension if not exists postgis;

-- One walk_sessions row per dog (toggled active); drives the live map.
create table if not exists public.walk_sessions (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null unique references public.dogs (id) on delete cascade,
  is_active boolean not null default false,
  location geography(Point, 4326),
  updated_at timestamptz not null default now()
);

create index if not exists walk_sessions_active_idx on public.walk_sessions (is_active);
create index if not exists walk_sessions_location_idx on public.walk_sessions using gist (location);

alter table public.walk_sessions enable row level security;

-- World-readable (others' active pins); writable only by the dog's owner.
drop policy if exists "ws_select_all" on public.walk_sessions;
create policy "ws_select_all" on public.walk_sessions for select using (true);

drop policy if exists "ws_insert_own" on public.walk_sessions;
create policy "ws_insert_own" on public.walk_sessions for insert
  with check (exists (select 1 from public.dogs d where d.id = dog_id and d.owner_id = auth.uid()));

drop policy if exists "ws_update_own" on public.walk_sessions;
create policy "ws_update_own" on public.walk_sessions for update
  using (exists (select 1 from public.dogs d where d.id = walk_sessions.dog_id and d.owner_id = auth.uid()))
  with check (exists (select 1 from public.dogs d where d.id = walk_sessions.dog_id and d.owner_id = auth.uid()));

drop policy if exists "ws_delete_own" on public.walk_sessions;
create policy "ws_delete_own" on public.walk_sessions for delete
  using (exists (select 1 from public.dogs d where d.id = walk_sessions.dog_id and d.owner_id = auth.uid()));

-- RPCs (security invoker → RLS still applies). Clients pass lat/lng numbers.
create or replace function public.start_walk(p_dog_id uuid, p_lat float8, p_lng float8)
returns void language sql as $$
  insert into public.walk_sessions (dog_id, is_active, location, updated_at)
  values (p_dog_id, true, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, now())
  on conflict (dog_id) do update
    set is_active = true,
        location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
        updated_at = now();
$$;

create or replace function public.update_walk_location(p_dog_id uuid, p_lat float8, p_lng float8)
returns void language sql as $$
  update public.walk_sessions
    set location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
        updated_at = now()
    where dog_id = p_dog_id and is_active = true;
$$;

create or replace function public.end_walk(p_dog_id uuid)
returns void language sql as $$
  update public.walk_sessions set is_active = false, updated_at = now()
    where dog_id = p_dog_id;
$$;

-- Active dogs within p_radius_m metres of (p_lat,p_lng), nearest first.
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
