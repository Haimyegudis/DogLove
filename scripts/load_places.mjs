// One-time (repeatable) import of Israel OSM pet/vet/dog-park POIs into a local
// places_poi table, then repoint nearby_places to query it for vet/petshop.
// Free OSM data, fetched country-wide once => instant, reliable, no live Overpass
// per request (which timed out / rate-limited / had a too-small radius).
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import pg from 'pg';

const SP = 'C:/Users/yegudish/AppData/Local/Temp/claude/C--APPS-DogLove/17220b3a-3727-435d-b523-93b3ce7c266f/scratchpad';
const ref = (process.env.SUPABASE_URL || '').replace(/^https:\/\/([^.]+)\..*/, '$1');
const c = new pg.Client({ host: 'aws-1-ap-southeast-1.pooler.supabase.com', port: 5432,
  user: `postgres.${ref}`, database: 'postgres', password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false } });

const kindOf = (t) => {
  if (t.amenity === 'veterinary' || t.healthcare === 'veterinary' || t.shop === 'veterinary') return 'vet';
  if (t.shop === 'pet' || t.shop === 'pet_grooming' || t.shop === 'animal_boarding') return 'petshop';
  if (t.leisure === 'dog_park') return 'dogpark';
  return null;
};

const run = async () => {
  await c.connect();
  const els = JSON.parse(readFileSync(SP + '/il_pois.json', 'utf8')).elements || [];

  await c.query(`create table if not exists public.places_poi (
    osm_id bigint primary key,
    kind text not null,
    name text,
    location geography(Point,4326) not null
  )`);
  await c.query(`create index if not exists places_poi_loc_gix on public.places_poi using gist (location)`);
  await c.query(`create index if not exists places_poi_kind_ix on public.places_poi (kind)`);
  await c.query('alter table public.places_poi enable row level security');
  await c.query(`drop policy if exists places_poi_read on public.places_poi`);
  await c.query(`create policy places_poi_read on public.places_poi for select using (true)`);

  let n = 0;
  for (const e of els) {
    const k = kindOf(e.tags || {});
    if (!k) continue;
    const lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon;
    if (lat == null || lng == null) continue;
    const name = (e.tags?.name || e.tags?.['name:he'] || e.tags?.['name:en'] || null);
    await c.query(
      `insert into public.places_poi (osm_id, kind, name, location)
       values ($1,$2,$3, st_setsrid(st_makepoint($5,$4),4326)::geography)
       on conflict (osm_id) do update set kind=excluded.kind, name=excluded.name, location=excluded.location`,
      [e.id, k, name, lat, lng]);
    n++;
  }
  const counts = await c.query(`select kind, count(*)::int n from public.places_poi group by kind order by kind`);
  console.log('inserted', n, '=> by kind:', JSON.stringify(counts.rows));
  await c.end();
};
run().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
