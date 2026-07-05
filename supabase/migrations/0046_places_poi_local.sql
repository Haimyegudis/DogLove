-- ===================================================================
-- Local POI table for vets & pet shops (free OSM data, imported once).
--
-- Why: live Overpass lookups for vets/pet shops were unreliable in sparse areas
-- — a too-small radius returned 0 or a single junk entry, and larger radii timed
-- out against the authenticated role's 8s statement_timeout / rate-limited
-- mirrors. Israel's entire vet + pet-shop + dog-park set from OSM is only ~500
-- rows, so we import it once into places_poi and query it locally (instant,
-- reliable, full-country coverage). Parks stay on live Overpass (well-mapped).
--
-- Data source: Overture Maps (free, no API key, far denser than raw OSM — it
-- has the local vets/pet shops OSM is missing). Loaded via scripts/load_overture.mjs
-- (see that file for the DuckDB extract query). scripts/load_places.mjs is the
-- older raw-OSM loader, kept as a fallback. Re-run to refresh.
-- ===================================================================

create table if not exists public.places_poi (
  osm_id   bigint primary key,
  kind     text not null,                 -- 'vet' | 'petshop' | 'dogpark'
  name     text,
  location geography(Point, 4326) not null
);
create index if not exists places_poi_loc_gix on public.places_poi using gist (location);
create index if not exists places_poi_kind_ix on public.places_poi (kind);

alter table public.places_poi enable row level security;
drop policy if exists places_poi_read on public.places_poi;
create policy places_poi_read on public.places_poi for select using (true);

-- Hybrid lookup: vets/pet shops from the local table, parks from live Overpass.
create or replace function public.nearby_places(
  p_lat float8, p_lng float8, p_kind text, p_radius_m float8 default 5000
)
returns table (id bigint, name text, lat float8, lng float8, kind text)
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_pt geography := st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography;
  v_radius float8; v_filter text; v_oql text; v_resp jsonb := null; v_el jsonb;
  v_url text; v_status int; v_content text; v_key text;
  v_qlat float8 := round(p_lat::numeric, 2); v_qlng float8 := round(p_lng::numeric, 2);
  v_endpoints text[] := array[
    'https://overpass-api.de/api/interpreter',
    'https://overpass.osm.ch/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ];
begin
  -- Vets & pet shops from the local table. Floor the radius at 30km so sparse
  -- areas still surface the nearest options (the UI shows the distance).
  if p_kind in ('vet','petshop') then
    return query
      select pp.osm_id, pp.name,
             st_y(pp.location::geometry)::float8, st_x(pp.location::geometry)::float8, p_kind
      from public.places_poi pp
      where pp.kind = p_kind
        and st_dwithin(pp.location, v_pt, greatest(p_radius_m, 30000))
      order by st_distance(pp.location, v_pt)
      limit 80;
    return;
  end if;

  -- Parks: live Overpass (well-mapped; overpass-api.de first, 4s per-mirror cap).
  v_radius := p_radius_m;
  v_key := p_kind || ':' || v_qlat || ':' || v_qlng || ':' || round((v_radius/1000)::numeric, 0);
  select payload into v_resp from public.osm_cache where cache_key = v_key and fetched_at > now() - interval '1 day';
  if v_resp is null then
    v_filter := format('node["leisure"="dog_park"](around:%s,%s,%s);way["leisure"="dog_park"](around:%s,%s,%s);node["leisure"="park"](around:%s,%s,%s);way["leisure"="park"](around:%s,%s,%s);',
      v_radius,v_qlat,v_qlng,v_radius,v_qlat,v_qlng,v_radius,v_qlat,v_qlng,v_radius,v_qlat,v_qlng);
    v_oql := '[out:json][timeout:20];(' || v_filter || ');out center 80;';
    perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '4000');
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
    id := (v_el->>'id')::bigint; name := nullif(v_el->'tags'->>'name',''); kind := p_kind;
    return next;
  end loop;
  return;
end; $$;
revoke execute on function public.nearby_places(float8, float8, text, float8) from public, anon;
grant  execute on function public.nearby_places(float8, float8, text, float8) to authenticated;
