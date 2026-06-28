-- Audit fixes: tighten public table reads, gate discovery on DOB, cache Overpass,
-- and add basic rate limits.

-- Definer helper: is this owner discoverable? (usable inside RLS policies, which
-- otherwise can't read other users' profiles).
create or replace function public.owner_discoverable(p_owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_discoverable from public.profiles where id = p_owner), true);
$$;
revoke execute on function public.owner_discoverable(uuid) from public;
grant execute on function public.owner_discoverable(uuid) to authenticated;

-- 1) Tighten SELECT on owner-keyed tables so a direct API query can't bypass the
-- block/discoverable filters that previously lived only in RPCs.
drop policy if exists "dogs_select_all" on public.dogs;
create policy "dogs_select_all" on public.dogs for select
  using (owner_id = auth.uid() or (public.owner_discoverable(owner_id) and not public.is_blocked_with(owner_id)));

drop policy if exists "posts_select_all" on public.dog_posts;
create policy "posts_select_all" on public.dog_posts for select
  using (owner_id = auth.uid() or (public.owner_discoverable(owner_id) and not public.is_blocked_with(owner_id)));

drop policy if exists "lost_select_all" on public.lost_dogs;
create policy "lost_select_all" on public.lost_dogs for select
  using (owner_id = auth.uid() or not public.is_blocked_with(owner_id));

drop policy if exists "gallery_select_all" on public.gallery_photos;
create policy "gallery_select_all" on public.gallery_photos for select
  using (owner_id = auth.uid() or (public.owner_discoverable(owner_id) and not public.is_blocked_with(owner_id)));

-- 2) Gate dog discovery on a set date_of_birth (adult-verified profiles only).
create or replace function public.browse_dogs(p_limit integer default 50)
returns table (dog_id uuid, name text, breed text, age integer, photo_url text, owner_id uuid, owner_name text)
language sql stable security definer set search_path = public as $$
  select d.id, d.name, d.breed, d.age, d.photo_url, d.owner_id, p.display_name
  from public.dogs d join public.profiles p on p.id = d.owner_id
  where d.owner_id <> auth.uid() and coalesce(p.is_discoverable, true)
    and p.date_of_birth is not null
    and not public.is_blocked_with(d.owner_id)
  order by d.created_at desc limit p_limit;
$$;

create or replace function public.search_dogs(p_q text, p_city text default null)
returns table (dog_id uuid, name text, breed text, age integer, photo_url text,
  owner_id uuid, owner_name text, city text)
language sql stable security definer set search_path = public as $$
  select d.id, d.name, d.breed, d.age, d.photo_url, d.owner_id, p.display_name, p.city
  from public.dogs d join public.profiles p on p.id = d.owner_id
  where d.owner_id <> auth.uid() and coalesce(p.is_discoverable, true)
    and p.date_of_birth is not null
    and not public.is_blocked_with(d.owner_id)
    and (coalesce(p_q, '') = ''
         or d.breed ilike '%' || p_q || '%'
         or d.name ilike '%' || p_q || '%'
         or p.display_name ilike '%' || p_q || '%')
    and (coalesce(p_city, '') = '' or p.city ilike '%' || p_city || '%')
  order by d.created_at desc limit 100;
$$;

revoke execute on function public.browse_dogs(integer) from public;
grant execute on function public.browse_dogs(integer) to authenticated;
revoke execute on function public.search_dogs(text, text) from public;
grant execute on function public.search_dogs(text, text) to authenticated;

-- 3) Overpass response cache (so places lookups are near-instant and stop
-- hammering external mirrors).
create table if not exists public.osm_cache (
  cache_key text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);
alter table public.osm_cache enable row level security;
drop policy if exists "osm_cache_select" on public.osm_cache;
create policy "osm_cache_select" on public.osm_cache for select using (true);

create or replace function public.nearby_places(
  p_lat float8, p_lng float8, p_kind text, p_radius_m float8 default 5000
)
returns table (id bigint, name text, lat float8, lng float8, kind text)
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_radius float8 := p_radius_m;
  v_filter text; v_oql text; v_resp jsonb := null; v_el jsonb;
  v_url text; v_status int; v_content text;
  v_key text;
  v_endpoints text[] := array[
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass.osm.ch/api/interpreter'
  ];
begin
  if p_kind = 'vet' then v_radius := greatest(p_radius_m, 15000); end if;
  -- ~1.1km grid + radius bucket so nearby callers share a cache entry.
  v_key := p_kind || ':' || round(p_lat::numeric, 2) || ':' || round(p_lng::numeric, 2) || ':' || round((v_radius/1000)::numeric, 0);

  select payload into v_resp from public.osm_cache
  where cache_key = v_key and fetched_at > now() - interval '1 day';

  if v_resp is null then
    if p_kind = 'vet' then
      v_filter := format('node["amenity"="veterinary"](around:%s,%s,%s);way["amenity"="veterinary"](around:%s,%s,%s);node["healthcare"="veterinary"](around:%s,%s,%s);node["shop"="veterinary"](around:%s,%s,%s);',
        v_radius,p_lat,p_lng, v_radius,p_lat,p_lng, v_radius,p_lat,p_lng, v_radius,p_lat,p_lng);
    elsif p_kind = 'park' then
      v_filter := format('node["leisure"="dog_park"](around:%s,%s,%s);way["leisure"="dog_park"](around:%s,%s,%s);node["leisure"="park"](around:%s,%s,%s);way["leisure"="park"](around:%s,%s,%s);',
        v_radius,p_lat,p_lng,v_radius,p_lat,p_lng,v_radius,p_lat,p_lng,v_radius,p_lat,p_lng);
    else
      v_filter := format('node["shop"="pet"](around:%s,%s,%s);way["shop"="pet"](around:%s,%s,%s);', v_radius,p_lat,p_lng,v_radius,p_lat,p_lng);
    end if;
    v_oql := '[out:json][timeout:25];(' || v_filter || ');out center 80;';
    perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '15000');
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
grant execute on function public.nearby_places(float8, float8, text, float8) to authenticated;

-- 4) Rate limits.
-- Messages: <=20 per sender per minute.
drop policy if exists "msg_insert_member" on public.messages;
create policy "msg_insert_member" on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_conv_member(conversation_id)
    and not public.is_blocked_with((
      select case when c.owner_a_id = auth.uid() then c.owner_b_id else c.owner_a_id end
      from public.conversations c where c.id = conversation_id
    ))
    and (select count(*) from public.messages m
         where m.sender_id = auth.uid() and m.created_at > now() - interval '1 minute') < 20
  );

-- Lost-dog reports: <=1 per user per 10 minutes (added inside the function).
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
    select push_token from public.profiles
    where id <> auth.uid() and push_token is not null
      and (v_loc is null or home_location is null or st_dwithin(home_location, v_loc, 50000))
  loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := jsonb_build_object('to', r.push_token, 'title', '🚨 כלב נעדר!',
        'body', coalesce(p_dog_name, 'כלב') || ' נעדר בקרבתך. אפשר לעזור?', 'sound', 'default'),
      headers := jsonb_build_object('Content-Type', 'application/json'));
  end loop;
  return v_id;
end; $$;
