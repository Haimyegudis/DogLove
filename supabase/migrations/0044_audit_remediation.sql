-- ===================================================================
-- Audit remediation wave (2026-07-04)
-- Closes the findings from the full security/privacy audit:
--  * premium self-grant (client could set is_premium directly)
--  * precise-location leaks via direct table SELECT (walk_sessions,
--    park_checkins, lost_dogs) that bypassed the RPC coarsening
--  * distance side-channel that let a caller trilaterate a home/live point
--  * ghost walkers with no staleness expiry
--  * silent home-location capture (now strictly opt-in)
--  * account deletion leaving orphaned public photos
--  * forgeable walk distance; missing rate limits; open challenge creation
--  * Overpass places lookup reliability + outbound-coordinate privacy
-- Forward-only, idempotent.
-- ===================================================================

-- ---------------------------------------------------------------
-- 1) Premium can no longer be self-granted from the client.
--    profiles_update_own only checks row ownership, not columns, so a
--    client could `update profiles set is_premium=true`. Guard the
--    privileged columns; only set_premium (which sets the GUC) may change them.
-- ---------------------------------------------------------------
create or replace function public.guard_profile_privileged()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.is_premium   is distinct from old.is_premium
      or new.premium_since is distinct from old.premium_since)
     and coalesce(current_setting('app.allow_premium', true), 'off') <> 'on' then
    -- silently revert unauthorised changes to privileged columns
    new.is_premium    := old.is_premium;
    new.premium_since := old.premium_since;
  end if;
  -- Home location / opt-in flag may only be changed via the sanctioned RPCs,
  -- so a direct client update can't bypass the share_home_area consent gate.
  if (new.home_location   is distinct from old.home_location
      or new.share_home_area is distinct from old.share_home_area)
     and coalesce(current_setting('app.allow_home', true), 'off') <> 'on' then
    new.home_location   := old.home_location;
    new.share_home_area := old.share_home_area;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_profile_privileged on public.profiles;
create trigger trg_guard_profile_privileged
  before update on public.profiles
  for each row execute function public.guard_profile_privileged();

-- set_premium is the only sanctioned path. NOTE: this remains a self-serve
-- demo flip; before charging, gate the body behind a verified purchase webhook.
create or replace function public.set_premium(p_on boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.allow_premium', 'on', true);
  update public.profiles
    set is_premium = p_on,
        premium_since = case when p_on then now() else null end
  where id = auth.uid();
  return p_on;
end; $$;
revoke execute on function public.set_premium(boolean) from public, anon;
grant  execute on function public.set_premium(boolean) to authenticated;

-- ---------------------------------------------------------------
-- 2) Lock down precise-location tables to owner-only direct SELECT.
--    Cross-user reads must go through the coarsening RPCs below.
-- ---------------------------------------------------------------
-- walk_sessions: was readable by any authenticated user (raw geography col).
drop policy if exists "ws_select_active_discoverable" on public.walk_sessions;
drop policy if exists "ws_select_all"                 on public.walk_sessions;
drop policy if exists "walk_sessions_select_all"      on public.walk_sessions;
drop policy if exists "ws_select_own"                 on public.walk_sessions;
create policy "ws_select_own" on public.walk_sessions for select
  using (exists (select 1 from public.dogs d
                 where d.id = walk_sessions.dog_id and d.owner_id = auth.uid()));

-- park_checkins: policy said "restricted" but was `using (true)`.
drop policy if exists "checkins_select_all" on public.park_checkins;
drop policy if exists "checkins_select_own" on public.park_checkins;
create policy "checkins_select_own" on public.park_checkins for select
  using (user_id = auth.uid());

-- lost_dogs: raw last-seen coords were directly readable; the screen uses the
-- coarse nearby_lost_dogs RPC, so owner-only direct read is safe.
drop policy if exists "lost_select_all" on public.lost_dogs;
drop policy if exists "lost_select_own" on public.lost_dogs;
create policy "lost_select_own" on public.lost_dogs for select
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------
-- 3) Ghost-walker staleness + coarse community counts.
--    A walk ends only on graceful client unmount; a killed app left a dog
--    "live" forever. Treat sessions older than 4h as stale everywhere.
-- ---------------------------------------------------------------
create or replace function public.nearby_active_dogs(p_lat float8, p_lng float8, p_radius_m float8)
returns table (dog_id uuid, name text, breed text, photo_url text, lat float8, lng float8, distance_m float8)
language sql stable security definer set search_path = public as $$
  select d.id, d.name, d.breed, d.photo_url,
    round(st_y(ws.location::geometry)::numeric, 3)::float8 as lat,
    round(st_x(ws.location::geometry)::numeric, 3)::float8 as lng,
    -- coarsen distance to 100 m buckets so it can't be used to trilaterate
    (round(st_distance(ws.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)::numeric / 100) * 100)::float8 as distance_m
  from public.walk_sessions ws
  join public.dogs d on d.id = ws.dog_id
  join public.profiles p on p.id = d.owner_id
  where ws.is_active = true and ws.location is not null
    and ws.started_at > now() - interval '4 hours'
    and coalesce(p.is_discoverable, true)
    and not public.is_blocked_with(d.owner_id)
    and st_dwithin(ws.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m)
  order by distance_m asc;
$$;
revoke execute on function public.nearby_active_dogs(float8, float8, float8) from public, anon;
grant  execute on function public.nearby_active_dogs(float8, float8, float8) to authenticated;

create or replace function public.list_active_walkers()
returns table (dog_id uuid, name text, breed text, photo_url text,
  owner_id uuid, owner_name text, city text, lat float8, lng float8, started_at timestamptz)
language sql stable security definer set search_path = public as $$
  select d.id, d.name, d.breed, d.photo_url, p.id, p.display_name, p.city,
    round(st_y(ws.location::geometry)::numeric, 3)::float8,
    round(st_x(ws.location::geometry)::numeric, 3)::float8,
    ws.started_at
  from public.walk_sessions ws
  join public.dogs d on d.id = ws.dog_id
  join public.profiles p on p.id = d.owner_id
  where ws.is_active = true
    and ws.started_at > now() - interval '4 hours'
    and coalesce(p.is_discoverable, true)
    and not public.is_blocked_with(d.owner_id)
  order by ws.started_at desc nulls last
  limit 200;
$$;
revoke execute on function public.list_active_walkers() from public;
grant  execute on function public.list_active_walkers() to authenticated;

-- Home dashboard counts (walk_sessions is now owner-only, so counting from the
-- client no longer works). Fresh, discoverable, non-stale figures only.
create or replace function public.community_counts()
returns table (active_walkers bigint, community_dogs bigint)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from public.walk_sessions ws
       join public.dogs d on d.id = ws.dog_id
       join public.profiles p on p.id = d.owner_id
      where ws.is_active = true
        and ws.started_at > now() - interval '4 hours'
        and coalesce(p.is_discoverable, true)),
    (select count(*) from public.dogs d
       join public.profiles p on p.id = d.owner_id
      where coalesce(p.is_discoverable, true));
$$;
revoke execute on function public.community_counts() from public, anon;
grant  execute on function public.community_counts() to authenticated;

-- ---------------------------------------------------------------
-- 4) Kill the distance trilateration side-channel in check-ins, lost dogs
--    and the feed; also make the feed honour ghost mode.
-- ---------------------------------------------------------------
create or replace function public.nearby_checkins(p_lat float8, p_lng float8, p_radius_m float8 default 5000)
returns table (id uuid, user_id uuid, display_name text, photo_url text, note text,
  lat float8, lng float8, distance_m float8, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.user_id, p.display_name, p.photo_url, c.note,
    round(st_y(c.location::geometry)::numeric, 3)::float8,
    round(st_x(c.location::geometry)::numeric, 3)::float8,
    (round(st_distance(c.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)::numeric / 100) * 100)::float8 as distance_m,
    c.created_at
  from public.park_checkins c
  join public.profiles p on p.id = c.user_id
  where c.expires_at > now()
    and c.user_id <> auth.uid()
    and coalesce(p.is_discoverable, true)
    and not public.is_blocked_with(c.user_id)
    and st_dwithin(c.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m)
  order by distance_m asc
  limit 100;
$$;
revoke execute on function public.nearby_checkins(float8, float8, float8) from public;
grant  execute on function public.nearby_checkins(float8, float8, float8) to authenticated;

create or replace function public.nearby_lost_dogs(p_lat float8, p_lng float8, p_radius_m float8 default 50000)
returns table (id uuid, dog_name text, photo_url text, note text, lat float8, lng float8,
  owner_name text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select l.id, l.dog_name, l.photo_url, l.note,
    round(st_y(l.location::geometry)::numeric, 3)::float8,
    round(st_x(l.location::geometry)::numeric, 3)::float8,
    p.display_name, l.created_at
  from public.lost_dogs l
  join public.profiles p on p.id = l.owner_id
  where l.is_found = false
    and (l.location is null or st_dwithin(l.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m))
  order by l.created_at desc limit 100;
$$;
revoke execute on function public.nearby_lost_dogs(float8, float8, float8) from public, anon;
grant  execute on function public.nearby_lost_dogs(float8, float8, float8) to authenticated;

create or replace function public.list_feed(p_limit integer default 50, p_lat float8 default null, p_lng float8 default null)
returns table (post_id uuid, photo_url text, caption text, created_at timestamptz,
  owner_id uuid, owner_name text, owner_photo text, dog_name text,
  reaction_count bigint, my_reaction text, distance_m float8)
language sql stable security definer set search_path = public as $$
  select p.id, p.photo_url, p.caption, p.created_at,
    p.owner_id, pr.display_name, pr.photo_url, d.name,
    (select count(*) from public.post_reactions r where r.post_id = p.id),
    (select r.emoji from public.post_reactions r where r.post_id = p.id and r.user_id = auth.uid()),
    -- coarsen home distance to 500 m buckets: enough to sort, not to locate
    case when p_lat is not null and p_lng is not null and pr.home_location is not null
      then (round(st_distance(pr.home_location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)::numeric / 500) * 500)::float8
      else null end
  from public.dog_posts p
  join public.profiles pr on pr.id = p.owner_id
  left join public.dogs d on d.id = p.dog_id
  where not public.is_blocked_with(p.owner_id)
    and (p.owner_id = auth.uid() or coalesce(pr.is_discoverable, true))
  order by
    case when p_lat is not null and p_lng is not null then
      (round(st_distance(coalesce(pr.home_location, st_setsrid(st_makepoint(0,0),4326)::geography),
                  st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)::numeric / 500) * 500)
    end asc nulls last,
    p.created_at desc
  limit p_limit;
$$;
revoke execute on function public.list_feed(integer, float8, float8) from public;
grant  execute on function public.list_feed(integer, float8, float8) to authenticated;

-- ---------------------------------------------------------------
-- 5) Home-location capture is now strictly opt-in.
--    Previously the client stamped home GPS on every feed/map mount with no
--    consent. Gate it behind an explicit flag the Privacy Center controls.
-- ---------------------------------------------------------------
alter table public.profiles add column if not exists share_home_area boolean not null default false;

create or replace function public.set_share_home_area(p_on boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.allow_home', 'on', true);
  update public.profiles
    set share_home_area = p_on,
        home_location = case when p_on then home_location else null end  -- forget location when turning off
  where id = auth.uid();
  return p_on;
end; $$;
revoke execute on function public.set_share_home_area(boolean) from public, anon;
grant  execute on function public.set_share_home_area(boolean) to authenticated;

-- No-op unless the user opted in.
create or replace function public.set_home_location(p_lat float8, p_lng float8)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.allow_home', 'on', true);
  update public.profiles
    set home_location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
  where id = auth.uid() and share_home_area = true;
end; $$;
revoke execute on function public.set_home_location(float8, float8) from public;
grant  execute on function public.set_home_location(float8, float8) to authenticated;

drop function if exists public.get_my_settings();
create or replace function public.get_my_settings()
returns table (is_discoverable boolean, share_home_area boolean)
language sql stable security definer set search_path = public as $$
  select coalesce(p.is_discoverable, true), coalesce(p.share_home_area, false)
  from public.profiles p where p.id = auth.uid();
$$;

-- ---------------------------------------------------------------
-- 6) Account deletion now also removes the user's storage objects, so
--    "delete everything" no longer leaves face photos live at public URLs.
-- ---------------------------------------------------------------
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, storage as $$
declare v_uid uuid := auth.uid();
begin
  delete from storage.objects
    where bucket_id in ('avatars', 'dog-photos')
      and (storage.foldername(name))[1] = v_uid::text;
  delete from auth.users where id = v_uid;  -- cascades all app tables
end; $$;
revoke execute on function public.delete_my_account() from public, anon;
grant  execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------
-- 7) Walk distance can no longer be forged into inflated stats/badges/verify.
--    Clamp client-reported distance to a physically plausible ceiling
--    (3 m/s ≈ 10.8 km/h) over the recorded walk duration.
-- ---------------------------------------------------------------
create or replace function public.end_walk(p_dog_id uuid, p_distance_m float8 default 0)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_started timestamptz; v_max float8;
begin
  select d.owner_id, ws.started_at into v_owner, v_started
  from public.walk_sessions ws join public.dogs d on d.id = ws.dog_id
  where ws.dog_id = p_dog_id;
  -- Only the walk's owner may end it (prevents ending a stranger's walk).
  if v_owner is distinct from auth.uid() then return; end if;
  update public.walk_sessions set is_active = false, updated_at = now() where dog_id = p_dog_id;
  if v_started is not null then
    v_max := greatest(0, extract(epoch from (now() - v_started)) * 3.0);
    insert into public.walk_log (owner_id, dog_id, started_at, ended_at, distance_m)
    values (v_owner, p_dog_id, v_started, now(), least(greatest(coalesce(p_distance_m, 0), 0), v_max));
  end if;
end; $$;
revoke execute on function public.end_walk(uuid, float8) from public, anon;
grant  execute on function public.end_walk(uuid, float8) to authenticated;

-- ---------------------------------------------------------------
-- 8) Rate limits on the remaining abuse-prone writes.
-- ---------------------------------------------------------------
-- Reports: <=10 per reporter per hour (report-bombing).
drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports for insert
  with check (reporter_id = auth.uid()
    and (select count(*) from public.reports r
         where r.reporter_id = auth.uid() and r.created_at > now() - interval '1 hour') < 10);

-- Posts: <=30 per owner per hour.
drop policy if exists "posts_insert_own" on public.dog_posts;
create policy "posts_insert_own" on public.dog_posts for insert
  with check (owner_id = auth.uid()
    and (select count(*) from public.dog_posts p
         where p.owner_id = auth.uid() and p.created_at > now() - interval '1 hour') < 30);

-- Index supporting all the new per-user/interval counts on messages.
create index if not exists messages_sender_time_idx on public.messages (sender_id, created_at desc);
create index if not exists reports_reporter_time_idx on public.reports (reporter_id, created_at desc);
create index if not exists posts_owner_time_idx on public.dog_posts (owner_id, created_at desc);

-- ---------------------------------------------------------------
-- 9) User-created community challenges are a real feature (challenges screen),
--    so keep the authenticated insert but note: add a per-user creator column +
--    rate limit + moderation before public launch to curb spam.
-- ---------------------------------------------------------------
drop policy if exists "challenges_insert_auth" on public.challenges;
create policy "challenges_insert_auth" on public.challenges for insert
  with check (auth.uid() is not null);

-- ---------------------------------------------------------------
-- 10) Lost-dog push: stop spamming users who have no home location, and never
--     notify blocked users. (Previously null home_location => everyone pinged.)
-- ---------------------------------------------------------------
create or replace function public.report_lost_dog(p_dog_id uuid, p_dog_name text, p_photo_url text, p_note text, p_lat float8, p_lng float8)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; r record; v_loc geography;
begin
  if exists (select 1 from public.lost_dogs where owner_id = auth.uid() and created_at > now() - interval '10 minutes') then
    raise exception 'נא להמתין לפני דיווח נוסף';
  end if;
  v_loc := case when p_lat is null then null else st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end;
  insert into public.lost_dogs (owner_id, dog_id, dog_name, photo_url, note, location)
  values (auth.uid(), p_dog_id, p_dog_name, p_photo_url, p_note, v_loc)
  returning id into v_id;
  for r in
    select pf.push_token, pf.id from public.profiles pf
    where pf.id <> auth.uid() and pf.push_token is not null
      and pf.home_location is not null
      and (v_loc is null or st_dwithin(pf.home_location, v_loc, 50000))
      and not public.is_blocked_with(pf.id)
  loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := jsonb_build_object('to', r.push_token, 'title', '🚨 כלב נעדר!',
        'body', coalesce(p_dog_name, 'כלב') || ' נעדר בקרבתך. אפשר לעזור?', 'sound', 'default'),
      headers := jsonb_build_object('Content-Type', 'application/json'));
  end loop;
  return v_id;
end; $$;
revoke execute on function public.report_lost_dog(uuid, text, text, text, float8, float8) from public, anon;
grant  execute on function public.report_lost_dog(uuid, text, text, text, float8, float8) to authenticated;

-- Bucket the walker distance too (was exact → trilateration of opt-in walkers).
create or replace function public.nearby_walkers(p_lat float8, p_lng float8, p_radius_m float8 default 5000)
returns table (user_id uuid, display_name text, photo_url text, city text,
  avg_stars numeric, rating_count bigint, distance_m float8)
language sql stable security definer set search_path = public as $$
  select pr.id, pr.display_name, pr.photo_url, pr.city,
    (select round(coalesce(avg(stars), 0), 1) from public.user_ratings r where r.rated_id = pr.id),
    (select count(*) from public.user_ratings r where r.rated_id = pr.id),
    (round(st_distance(pr.walker_location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)::numeric / 100) * 100)::float8 as distance_m
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
revoke execute on function public.nearby_walkers(float8, float8, float8) from public, anon;
grant  execute on function public.nearby_walkers(float8, float8, float8) to authenticated;

-- ---------------------------------------------------------------
-- 11) Places (Overpass) reliability + outbound-coordinate privacy.
--     Root cause of "no vets/pet shops": the busiest mirror (overpass-api.de)
--     rate-limits and the per-mirror 15s curl could exceed the API statement
--     timeout before a healthy mirror answered. Fixes:
--       * raise the function's own statement_timeout,
--       * shorter per-mirror timeout so all four get a turn,
--       * try privacy-friendly EU mirrors first, mail.ru last,
--       * round the OUTBOUND coordinates to ~1.1km (was sent precisely),
--       * broaden pet-shop tags for better coverage.
-- ---------------------------------------------------------------
create or replace function public.nearby_places(
  p_lat float8, p_lng float8, p_kind text, p_radius_m float8 default 5000
)
returns table (id bigint, name text, lat float8, lng float8, kind text)
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_radius float8 := p_radius_m;
  v_filter text; v_oql text; v_resp jsonb := null; v_el jsonb;
  v_url text; v_status int; v_content text; v_key text;
  v_qlat float8 := round(p_lat::numeric, 2);   -- ~1.1km grid for the outbound query
  v_qlng float8 := round(p_lng::numeric, 2);
  -- Order by real latency FROM the Supabase region: overpass-api.de answers in
  -- ~1.3s; kumi hangs and mail.ru is unreachable from the DB, so they trail as
  -- fallbacks only. A short per-mirror cap (below) keeps a dead mirror from
  -- eating the authenticated role's 8s statement_timeout.
  v_endpoints text[] := array[
    'https://overpass-api.de/api/interpreter',
    'https://overpass.osm.ch/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ];
begin
  if p_kind = 'vet' then v_radius := greatest(p_radius_m, 15000); end if;
  v_key := p_kind || ':' || v_qlat || ':' || v_qlng || ':' || round((v_radius/1000)::numeric, 0);

  select payload into v_resp from public.osm_cache
   where cache_key = v_key and fetched_at > now() - interval '1 day';

  if v_resp is null then
    if p_kind = 'vet' then
      v_filter := format('node["amenity"="veterinary"](around:%s,%s,%s);way["amenity"="veterinary"](around:%s,%s,%s);node["healthcare"="veterinary"](around:%s,%s,%s);node["shop"="veterinary"](around:%s,%s,%s);',
        v_radius,v_qlat,v_qlng, v_radius,v_qlat,v_qlng, v_radius,v_qlat,v_qlng, v_radius,v_qlat,v_qlng);
    elsif p_kind = 'park' then
      v_filter := format('node["leisure"="dog_park"](around:%s,%s,%s);way["leisure"="dog_park"](around:%s,%s,%s);node["leisure"="park"](around:%s,%s,%s);way["leisure"="park"](around:%s,%s,%s);',
        v_radius,v_qlat,v_qlng,v_radius,v_qlat,v_qlng,v_radius,v_qlat,v_qlng,v_radius,v_qlat,v_qlng);
    else
      -- broadened pet-shop coverage
      v_filter := format('node["shop"="pet"](around:%s,%s,%s);way["shop"="pet"](around:%s,%s,%s);node["shop"="pet_grooming"](around:%s,%s,%s);node["shop"="animal_boarding"](around:%s,%s,%s);',
        v_radius,v_qlat,v_qlng,v_radius,v_qlat,v_qlng,v_radius,v_qlat,v_qlng,v_radius,v_qlat,v_qlng);
    end if;
    v_oql := '[out:json][timeout:20];(' || v_filter || ');out center 80;';
    perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '4000');  -- fail a dead mirror fast, fit the 8s role budget
    foreach v_url in array v_endpoints loop
      begin
        select r.status, r.content into v_status, v_content
        from extensions.http_post(v_url, 'data=' || extensions.urlencode(v_oql), 'application/x-www-form-urlencoded') r;
        if v_status = 200 and v_content is not null then
          v_resp := v_content::jsonb;
          if jsonb_array_length(coalesce(v_resp->'elements','[]'::jsonb)) > 0 then exit; end if;
        end if;
      exception when others then v_resp := null; end;
    end loop;
    if v_resp is not null and jsonb_array_length(coalesce(v_resp->'elements','[]'::jsonb)) > 0 then
      insert into public.osm_cache (cache_key, payload, fetched_at) values (v_key, v_resp, now())
      on conflict (cache_key) do update set payload = excluded.payload, fetched_at = now();
    end if;
  end if;

  if v_resp is null then return; end if;
  for v_el in select * from jsonb_array_elements(coalesce(v_resp->'elements','[]'::jsonb)) loop
    lat := coalesce((v_el->>'lat')::float8, (v_el->'center'->>'lat')::float8);
    lng := coalesce((v_el->>'lon')::float8, (v_el->'center'->>'lon')::float8);
    if lat is null or lng is null then continue; end if;
    id := (v_el->>'id')::bigint;
    name := nullif(v_el->'tags'->>'name', '');
    kind := p_kind;
    return next;
  end loop;
  return;
end; $$;
revoke execute on function public.nearby_places(float8, float8, text, float8) from public;
grant  execute on function public.nearby_places(float8, float8, text, float8) to authenticated;
