#!/usr/bin/env node
/*
 * Import ./backup into a NEW Supabase project over a DIRECT Postgres connection
 * (NEW_DATABASE_URL - the Session Pooler string). No service-role key needed.
 *
 * Why this beats the REST/Admin-API route: we insert auth.users WITH their
 * ORIGINAL UUIDs, so every foreign key in the backup stays valid as-is - no
 * remapping, a byte-faithful copy. Passwords can't be recovered, so each user
 * gets IMPORT_TEMP_PASSWORD (bcrypt via pgcrypto) and resets on first login.
 *
 * Order respects FKs. Re-runnable: auth rows ON CONFLICT DO NOTHING, data rows
 * upsert/onConflict-do-nothing on id. Run the SCHEMA first (npm run migrate).
 *
 * Usage: node scripts/import-pg.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const CONN = process.env.NEW_DATABASE_URL;
const TEMP_PASSWORD = process.env.IMPORT_TEMP_PASSWORD || 'ChangeMe!2026';
const BACKUP = path.join(__dirname, '..', 'backup');

if (!CONN) {
  console.error('❌ NEW_DATABASE_URL not set in .env (the Session Pooler connection string).');
  process.exit(1);
}

const load = (n) => {
  const p = path.join(BACKUP, `${n}.json`);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : [];
};

const db = new Client({ connectionString: CONN, ssl: { rejectUnauthorized: false } });

/**
 * Bulk insert rows into a table using json_populate_recordset so Postgres does
 * all type coercion (jsonb, arrays, timestamps) from the table's own row type.
 * Only columns that exist on BOTH the JSON and the table are written.
 */
async function importTable(table, { conflict = 'do_nothing', wipeFirst = false } = {}) {
  const rows = load(table);
  if (!rows.length) { console.log(`   ·  ${table.padEnd(22)} 0 rows (skip)`); return; }

  // Determine the real columns of the target table.
  const colRes = await db.query(
    `select column_name from information_schema.columns where table_schema='public' and table_name=$1`,
    [table]
  );
  const tableCols = new Set(colRes.rows.map((r) => r.column_name));
  const cols = Object.keys(rows[0]).filter((k) => tableCols.has(k));
  const colList = cols.map((c) => `"${c}"`).join(', ');

  if (wipeFirst) await db.query(`delete from public.${table}`);

  let onConflict = '';
  if (conflict === 'do_nothing') onConflict = 'on conflict (id) do nothing';
  else if (conflict === 'update') {
    const sets = cols.filter((c) => c !== 'id').map((c) => `"${c}"=excluded."${c}"`).join(', ');
    onConflict = `on conflict (id) do update set ${sets}`;
  }

  // Strip each row down to the shared columns before sending as JSON.
  const slim = rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]])));
  const sql = `insert into public.${table} (${colList})
               select ${colList} from json_populate_recordset(null::public.${table}, $1::json)
               ${onConflict}`;
  const before = await db.query(`select count(*)::int n from public.${table}`);
  await db.query(sql, [JSON.stringify(slim)]);
  const after = await db.query(`select count(*)::int n from public.${table}`);
  const added = after.rows[0].n - before.rows[0].n;
  const dropped = Object.keys(rows[0]).filter((k) => !tableCols.has(k));
  console.log(`   ✅ ${table.padEnd(22)} +${added} (now ${after.rows[0].n})${dropped.length ? `  ⚠️ ignored cols: ${dropped.join(',')}` : ''}`);
}

async function importAuthUsers() {
  const users = load('users');
  console.log(`\n👤 auth.users + identities: ${users.length} users`);
  let created = 0, skipped = 0, noLogin = 0;

  for (const u of users) {
    const meta = JSON.stringify({ business_name: u.name, phone: u.phone, role: u.role });
    // Insert the auth user, preserving the original UUID.
    const res = await db.query(
      `insert into auth.users
         (instance_id, id, aud, role, email, phone,
          encrypted_password, email_confirmed_at, phone_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
          confirmation_token, recovery_token, email_change, email_change_token_new)
       values
         ('00000000-0000-0000-0000-000000000000', $1::uuid, 'authenticated', 'authenticated', $2::text, $3::text,
          crypt($4::text, gen_salt('bf', 10)),
          case when $2::text is not null then now() else null end,
          case when $2::text is null and $3::text is not null then now() else null end,
          '{"provider":"email","providers":["email"]}'::jsonb, $5::jsonb,
          coalesce($6::timestamptz, now()), now(),
          '', '', '', '')   -- GoTrue scans these into non-null strings; must not be NULL
       on conflict (id) do nothing`,
      [u.id, u.email || null, u.phone || null, TEMP_PASSWORD, meta, u.created_at || null]
    );
    if (res.rowCount === 0) skipped++; else created++;

    // Matching identity row so signInWithPassword works (idempotent).
    if (u.email) {
      await db.query(
        `insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
         values ($1::text, $2::uuid, jsonb_build_object('sub',$2::text,'email',$1::text,'email_verified',true), 'email', now(), now(), now())
         on conflict do nothing`,
        [u.email, u.id]
      );
    } else {
      noLogin++; // phone-only or no contact - created but no email-login identity
    }
  }
  console.log(`   ✅ ${created} created · ♻️ ${skipped} already existed · ${noLogin} without email-login`);
}

async function setSeq(table) {
  await db.query(
    `select setval(pg_get_serial_sequence('public.${table}','id'), coalesce((select max(id) from public.${table}),1), true)`
  );
}

async function main() {
  console.log('🚚 Skymap - Import backup → NEW project (direct Postgres, UUIDs preserved)');
  console.log('═'.repeat(60));
  await db.connect();
  await db.query('set search_path to public, extensions, auth');
  await db.query('create extension if not exists pgcrypto');

  // 1) Auth (preserves UUIDs) -> public.users profiles get auto-created by trigger.
  await importAuthUsers();

  console.log('\n📥 Profiles & permissions');
  await importTable('users', { conflict: 'update' }); // overwrite trigger-created rows with exact data
  await importTable('user_permissions');

  console.log('\n📥 Reference & content (preserve IDs; reseed where schema seeded)');
  await importTable('regions', { conflict: 'do_nothing' });
  await importTable('districts', { conflict: 'do_nothing' });
  await importTable('delivery_fee_packages', { wipeFirst: true });
  await importTable('expense_categories', { wipeFirst: true });
  await importTable('sms_templates', { wipeFirst: true });
  await importTable('company_profile', { wipeFirst: true });
  await importTable('payment_instructions', { wipeFirst: true });
  await importTable('slider_images');
  await importTable('cms_content');

  console.log('\n📥 Core business data');
  await importTable('businesses');
  await importTable('deliveries');
  await importTable('delivery_events');
  await importTable('charges');
  await importTable('expenses');
  await importTable('invoices');
  await importTable('invoice_items');

  console.log('\n📥 Messaging');
  await importTable('sms_broadcasts');
  await importTable('sms_logs');
  // otp_codes intentionally skipped (transient one-time codes).

  // Keep integer sequences ahead of imported max(id).
  await setSeq('regions');
  await setSeq('districts');

  await db.end();
  console.log('\n' + '═'.repeat(60));
  console.log('🏁 Import complete. Original UUIDs preserved - all foreign keys intact.');
  console.log(`🔑 Every user can log in with email + temp password "${TEMP_PASSWORD}" (ask them to reset).`);
}

main().catch((e) => { console.error('\n❌', e.message); process.exit(1); });
