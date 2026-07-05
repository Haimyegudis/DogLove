// Apply Supabase migrations over the pooler connection using the `pg` module.
//
// Usage:
//   1. Put your Supabase DB password in .env as SUPABASE_DB_PASSWORD=...
//      (Dashboard → Project Settings → Database → Database password)
//   2. Run:  node scripts/apply-migrations.mjs
//      or apply specific files: node scripts/apply-migrations.mjs 0044_audit_remediation.sql 0045_data_export.sql
//
// The migrations are idempotent (create-or-replace / drop-if-exists), so
// re-running is safe.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');

const ref = (process.env.SUPABASE_URL || '').replace(/^https:\/\/([^.]+)\..*/, '$1');
const password = process.env.SUPABASE_DB_PASSWORD;
if (!ref) { console.error('SUPABASE_URL missing in .env'); process.exit(1); }
if (!password) {
  console.error('SUPABASE_DB_PASSWORD missing. Add it to .env (Dashboard → Settings → Database → Database password).');
  process.exit(1);
}

// Default: the two unapplied migrations. Override by passing filenames as args.
const files = process.argv.slice(2);
const toApply = files.length ? files : ['0044_audit_remediation.sql', '0045_data_export.sql'];

const client = new pg.Client({
  host: `aws-1-ap-southeast-1.pooler.supabase.com`,
  port: 5432,
  user: `postgres.${ref}`,
  database: 'postgres',
  password,
  ssl: { rejectUnauthorized: false },
});

const run = async () => {
  await client.connect();
  for (const name of toApply) {
    const sql = readFileSync(join(migrationsDir, name), 'utf8');
    process.stdout.write(`Applying ${name} ... `);
    await client.query(sql);
    console.log('OK');
  }
  await client.end();
  console.log('All migrations applied.');
};

run().catch((e) => { console.error('\nFAILED:', e.message); client.end().catch(() => {}); process.exit(1); });
