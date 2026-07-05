// Load Overture Maps pet/vet places into places_poi (dense, free, no API key).
//
// Overture (https://overturemaps.org) aggregates POIs from many sources and is
// far denser than raw OSM — it has local vets/pet shops that OSM is missing.
//
// TWO STEPS (both free):
//   1) EXTRACT (needs DuckDB — `npm i duckdb` in a scratch dir), query the
//      public Overture S3 parquet for Israel and write overture_il.json:
//
//      INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial;
//      SET s3_region='us-west-2';
//      COPY (
//        select id, names.primary as name, categories.primary as cat,
//               ST_Y(geometry) as lat, ST_X(geometry) as lng
//        from read_parquet('s3://overturemaps-us-west-2/release/<LATEST>/theme=places/type=place/*.parquet', hive_partitioning=1)
//        where bbox.xmin between 34.2 and 35.95 and bbox.ymin between 29.4 and 33.5
//          and categories.primary in ('veterinarian','animal_hospital','pet_store',
//              'pet_supply_store','aquatic_pet_store','pet_groomer','pet_boarding','pet_services')
//          and names.primary is not null
//      ) TO 'overture_il.json';
//      -- find <LATEST> with: select file from glob('s3://overturemaps-us-west-2/release/*/theme=places/type=place/*.parquet') order by file desc limit 1;
//
//   2) LOAD (this script): node scripts/load_overture.mjs <path-to-overture_il.json>
//      Requires SUPABASE_DB_PASSWORD in .env. Replaces the vet/petshop rows in
//      places_poi; nearby_places (migration 0046) serves them locally.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const jsonPath = process.argv[2];
if (!jsonPath) { console.error('usage: node scripts/load_overture.mjs <overture_il.json>'); process.exit(1); }

const ref = (process.env.SUPABASE_URL || '').replace(/^https:\/\/([^.]+)\..*/, '$1');
const c = new pg.Client({ host: 'aws-1-ap-southeast-1.pooler.supabase.com', port: 5432,
  user: `postgres.${ref}`, database: 'postgres', password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false } });

// Stable bigint id from the Overture GERS id (stable across releases).
const hid = (s) => BigInt('0x' + crypto.createHash('md5').update(s).digest('hex').slice(0, 15)).toString();
const kindOf = (cat) => (cat === 'veterinarian' || cat === 'animal_hospital') ? 'vet' : 'petshop';

const run = async () => {
  await c.connect();
  const rows = JSON.parse(readFileSync(jsonPath, 'utf8'));
  await c.query(`delete from public.places_poi where kind in ('vet','petshop')`);
  let n = 0;
  for (const r of rows) {
    if (r.lat == null || r.lng == null) continue;
    await c.query(
      `insert into public.places_poi (osm_id, kind, name, location)
       values ($1,$2,$3, st_setsrid(st_makepoint($5,$4),4326)::geography)
       on conflict (osm_id) do update set kind=excluded.kind, name=excluded.name, location=excluded.location`,
      [hid(r.id), kindOf(r.cat), r.name, r.lat, r.lng]);
    n++;
  }
  const cnt = await c.query(`select kind, count(*)::int n from public.places_poi group by kind order by kind`);
  console.log('loaded', n, '=>', JSON.stringify(cnt.rows));
  await c.end();
};
run().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
