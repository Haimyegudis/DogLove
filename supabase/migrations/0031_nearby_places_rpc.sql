-- Server-side Overpass lookup so parks/vets/pet-shops work regardless of the
-- phone's network. Runs from Supabase's servers via the http extension, tries
-- several Overpass mirrors, and skips empty answers so one stale mirror can't
-- mask the others.

create extension if not exists http with schema extensions;

create or replace function public.nearby_places(
  p_lat float8, p_lng float8, p_kind text, p_radius_m float8 default 5000
)
returns table (id bigint, name text, lat float8, lng float8, kind text)
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_radius float8 := p_radius_m;
  v_filter text;
  v_oql text;
  v_resp jsonb := null;
  v_el jsonb;
  v_url text;
  v_status int;
  v_content text;
  v_endpoints text[] := array[
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass.osm.ch/api/interpreter'
  ];
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '15000');

  if p_kind = 'vet' then
    v_radius := greatest(p_radius_m, 15000);
    v_filter := format(
      'node["amenity"="veterinary"](around:%s,%s,%s);way["amenity"="veterinary"](around:%s,%s,%s);node["healthcare"="veterinary"](around:%s,%s,%s);node["shop"="veterinary"](around:%s,%s,%s);',
      v_radius, p_lat, p_lng, v_radius, p_lat, p_lng, v_radius, p_lat, p_lng, v_radius, p_lat, p_lng);
  elsif p_kind = 'park' then
    v_filter := format(
      'node["leisure"="dog_park"](around:%s,%s,%s);way["leisure"="dog_park"](around:%s,%s,%s);node["leisure"="park"](around:%s,%s,%s);way["leisure"="park"](around:%s,%s,%s);',
      v_radius, p_lat, p_lng, v_radius, p_lat, p_lng, v_radius, p_lat, p_lng, v_radius, p_lat, p_lng);
  else
    v_filter := format(
      'node["shop"="pet"](around:%s,%s,%s);way["shop"="pet"](around:%s,%s,%s);',
      v_radius, p_lat, p_lng, v_radius, p_lat, p_lng);
  end if;

  v_oql := '[out:json][timeout:25];(' || v_filter || ');out center 80;';

  foreach v_url in array v_endpoints loop
    begin
      select r.status, r.content into v_status, v_content
      from extensions.http_post(v_url, 'data=' || extensions.urlencode(v_oql), 'application/x-www-form-urlencoded') r;
      if v_status = 200 and v_content is not null then
        v_resp := v_content::jsonb;
        if jsonb_array_length(coalesce(v_resp->'elements', '[]'::jsonb)) > 0 then
          exit; -- got data, stop trying mirrors
        end if;
      end if;
    exception when others then
      v_resp := null; -- mirror failed, try the next
    end;
  end loop;

  if v_resp is null then return; end if;

  for v_el in select * from jsonb_array_elements(coalesce(v_resp->'elements', '[]'::jsonb)) loop
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
