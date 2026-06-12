#!/usr/bin/env node
/*
 * Direct Postgres migration runner for the Skymap Supabase database.
 *
 * Why this exists: the Supabase JS client CANNOT run DDL (CREATE TABLE, ALTER,
 * CREATE POLICY, functions/triggers). The older scripts (run-sql.js,
 * run-sql-direct.js) tried to POST to a non-existent `exec_sql` RPC and always
 * fell back to "run it manually". This connects straight to Postgres and runs
 * the SQL for real.
 *
 * Usage:
 *   node scripts/migrate.js            # run the full ordered migration list
 *   node scripts/migrate.js --file database/sms-tables.sql   # run one file
 *   node scripts/migrate.js --dry      # parse + list statements, run nothing
 *
 * Requires DATABASE_URL (or SUPABASE_DB_URL) in .env - see the README block
 * printed by this script if it's missing.
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load .env first, then let .env.local override (Next.js convention).
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const CONNECTION_STRING = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

// ---------------------------------------------------------------------------
// Ordered list of schema files. Dependency order matters: base tables + RLS +
// triggers first, then the RLS recursion fix, then feature schemas, then
// incremental column adds, then storage buckets.
//
// Re-running is SAFE: this runner tolerates "already exists" errors, and most
// files use IF NOT EXISTS / ON CONFLICT. Edit this list freely.
// ---------------------------------------------------------------------------
const MIGRATIONS = [
  // --- Core baseline: locations, all core tables, RLS, triggers, seed data ---
  'database/full-schema-migration.sql',

  // --- RLS corrections (must come AFTER base RLS) ---
  'database/fix-rls-recursion.sql',
  'database/add-users-insert-policy.sql',

  // --- Granular permissions (table not in the base schema) ---
  'database/permissions.sql',
  'database/migrations/add_user_permissions_active.sql',

  // --- Feature schemas ---
  'database/cms-schema.sql',
  'database/company-profile-schema.sql',
  'database/delivery-packages-schema.sql',
  'database/expenses-schema.sql',
  'database/invoice-enhancements-schema.sql',
  'database/sms-tables.sql',

  // --- Incremental column / field additions ---
  'database/add-verification-fields.sql',
  'database/add-rider-profile-fields.sql',
  'database/add-coordinates-to-deliveries.sql',
  'database/add_package_image.sql',
  'database/add-supplier-to-expenses.sql',
  'database/add-email-to-users.sql',
  'database/add-delivery-fee.sql',
  'database/add-delivery-locations.sql',
  'database/add-missing-columns.sql',

  // --- migrations/ folder ---
  'database/migrations/add_business_coordinates.sql',
  'database/migrations/add_businesses_delivery_fee.sql',
  'database/migrations/add_delivery_fee_column.sql',
  'database/migrations/add_pending_confirmation_status.sql',
  'database/migrations/fix_schema_drift.sql',

  // --- Storage buckets ---
  'database/create-business-logos-bucket.sql',
  'database/create-slider-images-bucket.sql',
];

// Postgres error codes that mean "this object is already there" - safe to skip
// when re-running against an existing database.
const IDEMPOTENT_CODES = new Set([
  '42P07', // duplicate_table
  '42710', // duplicate_object (policy, trigger, constraint, etc.)
  '42701', // duplicate_column
  '42P06', // duplicate_schema
  '42723', // duplicate_function
  '42P04', // duplicate_database
  '23505', // unique_violation (re-seeding rows without ON CONFLICT)
]);

/**
 * Split a SQL script into top-level statements.
 * Respects: line comments (--), block comments (/* *​/), single-quoted strings,
 * and dollar-quoted blocks ($$ ... $$ and $tag$ ... $tag$) so that function and
 * trigger bodies (which contain semicolons) are kept intact.
 */
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let i = 0;
  const n = sql.length;

  while (i < n) {
    const ch = sql[i];
    const next = sql[i + 1];

    // Line comment
    if (ch === '-' && next === '-') {
      const eol = sql.indexOf('\n', i);
      const end = eol === -1 ? n : eol;
      current += sql.slice(i, end);
      i = end;
      continue;
    }
    // Block comment
    if (ch === '/' && next === '*') {
      const close = sql.indexOf('*/', i + 2);
      const end = close === -1 ? n : close + 2;
      current += sql.slice(i, end);
      i = end;
      continue;
    }
    // Single-quoted string
    if (ch === "'") {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; } // escaped ''
        if (sql[j] === "'") { j++; break; }
        j++;
      }
      current += sql.slice(i, j);
      i = j;
      continue;
    }
    // Dollar-quoted block: $tag$ ... $tag$
    if (ch === '$') {
      const tagMatch = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i));
      if (tagMatch) {
        const tag = tagMatch[0];
        const close = sql.indexOf(tag, i + tag.length);
        const end = close === -1 ? n : close + tag.length;
        current += sql.slice(i, end);
        i = end;
        continue;
      }
    }
    // Statement terminator
    if (ch === ';') {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
      i++;
      continue;
    }
    current += ch;
    i++;
  }
  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

// A short label for logging without dumping the whole statement.
function label(stmt) {
  return stmt.replace(/\s+/g, ' ').slice(0, 70);
}

async function runFile(client, relPath, dry) {
  const abs = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(abs)) {
    console.log(`  ⚠️  SKIP (not found): ${relPath}`);
    return { applied: 0, skipped: 0, failed: 0, missing: true };
  }
  const sql = fs.readFileSync(abs, 'utf-8');
  const statements = splitStatements(sql);
  console.log(`\n📄 ${relPath}  (${statements.length} statements)`);

  let applied = 0, skipped = 0, failed = 0;
  for (const stmt of statements) {
    if (dry) { console.log(`   · ${label(stmt)}`); continue; }
    try {
      await client.query(stmt);
      applied++;
      process.stdout.write('.');
    } catch (err) {
      if (IDEMPOTENT_CODES.has(err.code)) {
        skipped++;
        process.stdout.write('○'); // already exists - fine
      } else {
        failed++;
        console.log(`\n   ❌ [${err.code || '?'}] ${err.message}`);
        console.log(`      ↳ ${label(stmt)}`);
      }
    }
  }
  if (!dry) console.log(`\n   ✅ ${applied} applied · ○ ${skipped} already-present · ❌ ${failed} failed`);
  return { applied, skipped, failed, missing: false };
}

function printMissingCredsHelp() {
  console.log(`
❌ No database connection string found.

Add ONE line to your .env file (project root):

    DATABASE_URL=postgresql://postgres.<ref>:<YOUR-DB-PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres

Where to get it:
  1. Supabase Dashboard → your project (ref: ergemtnsxdvbboyjxdyy)
  2. Settings → Database → "Connection string"
  3. Choose the "Session pooler" (port 5432) URI - best for migrations.
  4. Replace [YOUR-PASSWORD] with your actual database password.

Then run:  npm run migrate
`);
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const fileArg = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;

  console.log('🚀 Skymap - Direct Postgres Migration Runner');
  console.log('═'.repeat(55));

  const files = fileArg ? [fileArg] : MIGRATIONS;

  if (dry) {
    console.log('🔎 DRY RUN - parsing only, nothing will be executed.\n');
    for (const f of files) await runFile(null, f, true);
    return;
  }

  if (!CONNECTION_STRING) {
    printMissingCredsHelp();
    process.exit(1);
  }

  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }, // Supabase requires SSL
  });

  try {
    console.log('🔌 Connecting...');
    await client.connect();
    const { rows } = await client.query('SELECT current_database() AS db, current_user AS usr');
    console.log(`✅ Connected to "${rows[0].db}" as "${rows[0].usr}"\n`);
  } catch (err) {
    console.error(`❌ Connection failed: ${err.message}`);
    console.error('   Check your DATABASE_URL (password, host, port 5432).');
    process.exit(1);
  }

  const totals = { applied: 0, skipped: 0, failed: 0 };
  for (const f of files) {
    const r = await runFile(client, f, false);
    totals.applied += r.applied;
    totals.skipped += r.skipped;
    totals.failed += r.failed;
  }

  await client.end();

  console.log('\n' + '═'.repeat(55));
  console.log(`🏁 DONE - ${totals.applied} applied · ${totals.skipped} already-present · ${totals.failed} failed`);
  if (totals.failed > 0) {
    console.log('⚠️  Some statements failed (see ❌ above). Review and re-run if needed.');
    process.exit(1);
  } else {
    console.log('🎉 All migrations applied cleanly.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
