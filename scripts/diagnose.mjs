// Diagnose the live DB: what's applied, what's missing, why dogs/vets don't show.
//
// 1. Add your DB password to .env:  SUPABASE_DB_PASSWORD=...
//    (Supabase Dashboard -> Project Settings -> Database -> Database password)
// 2. Run:  node scripts/diagnose.mjs
//    Paste the whole output back to me.
//
// Read-only except the nearby_places call (which hits Overpass, harmless).
import 'dotenv/config';
import pg from 'pg';

const ref = (process.env.SUPABASE_URL || '').replace(/^https:\/\/([^.]+)\..*/, '$1');
const password = process.env.SUPABASE_DB_PASSWORD;
if (!ref || !password) {
  console.error('Missing SUPABASE_URL or SUPABASE_DB_PASSWORD in .env');
  process.exit(1);
}
const c = new pg.Client({
  host: 'aws-1-ap-southeast-1.pooler.supabase.com', port: 5432,
  user: `postgres.${ref}`, database: 'postgres', password,
  ssl: { rejectUnauthorized: false },
});

const q = async (label, sql) => {
  try { const r = await c.query(sql); console.log(label, '=>', JSON.stringify(r.rows)); }
  catch (e) { console.log(label, '=> ERROR:', e.message); }
};

const run = async () => {
  await c.connect();
  console.log('=== EXTENSIONS ===');
  await q('extensions', `select extname from pg_extension where extname in ('http','postgis','pg_net') order by extname`);

  console.log('\n=== KEY RPCs PRESENT? ===');
  await q('functions', `select proname from pg_proc where proname in
    ('nearby_places','browse_dogs','community_counts','nearby_active_dogs','discover_owners','export_my_data','set_share_home_area','guard_profile_privileged') order by proname`);

  console.log('\n=== DATA COUNTS ===');
  await q('profiles_total', `select count(*) from public.profiles`);
  await q('profiles_with_dob', `select count(*) from public.profiles where date_of_birth is not null`);
  await q('profiles_discoverable', `select count(*) from public.profiles where coalesce(is_discoverable,true)`);
  await q('dogs_total', `select count(*) from public.dogs`);
  await q('dogs_visible_in_browse', `select count(*) from public.dogs d join public.profiles p on p.id=d.owner_id
     where coalesce(p.is_discoverable,true) and p.date_of_birth is not null`);
  await q('active_walks', `select count(*) from public.walk_sessions where is_active=true`);
  await q('osm_cache_rows', `select count(*) from public.osm_cache`).catch(()=>{});

  console.log('\n=== VET/PETSHOP END-TO-END (Tel Aviv) ===');
  await q('nearby_places_vet', `select count(*) as n from public.nearby_places(32.0853,34.7818,'vet',15000)`);
  await q('nearby_places_petshop', `select count(*) as n from public.nearby_places(32.0853,34.7818,'petshop',8000)`);

  console.log('\n=== MIGRATION HINT ===');
  await q('has_share_home_area_col', `select column_name from information_schema.columns
     where table_schema='public' and table_name='profiles' and column_name in ('share_home_area','home_location','is_premium')`);

  await c.end();
  console.log('\nDONE. Paste all of the above back.');
};
run().catch((e) => { console.error('CONNECT FAILED:', e.message); process.exit(1); });
