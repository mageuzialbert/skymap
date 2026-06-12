#!/usr/bin/env node
/*
 * Import the ./backup JSON data into a NEW Supabase project.
 *
 * Steps:
 *   1. Re-create auth users (Admin API) — gives NEW UUIDs + a temp password.
 *      Builds userIdMap (oldId -> newId).
 *   2. Update each new public.users row with the backed-up profile fields.
 *   3. Insert all other tables, preserving their original PKs and remapping
 *      only the columns that reference users (via userIdMap).
 *
 * Prereqs:
 *   - Run the SCHEMA first on the new project (database/_apply_all.sql in the
 *     SQL Editor, or `npm run migrate` with NEW_DATABASE_URL set).
 *   - Add to .env:
 *       NEW_SUPABASE_URL=https://<new-ref>.supabase.co
 *       NEW_SUPABASE_SERVICE_ROLE_KEY=<new service_role key>
 *       IMPORT_TEMP_PASSWORD=ChangeMe!2026   (optional; default below)
 *
 * Re-runnable: auth users are matched by email/phone; data tables upsert on id.
 *
 * Usage: node scripts/import-to-new.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const URL = process.env.NEW_SUPABASE_URL;
const KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;
const TEMP_PASSWORD = process.env.IMPORT_TEMP_PASSWORD || 'ChangeMe!2026';
const BACKUP = path.join(__dirname, '..', 'backup');

if (!URL || !KEY) {
  console.error(`❌ Missing NEW project credentials. Add to .env:
    NEW_SUPABASE_URL=https://<new-ref>.supabase.co
    NEW_SUPABASE_SERVICE_ROLE_KEY=<new service_role key>`);
  process.exit(1);
}

const db = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const userIdMap = new Map(); // oldUserId -> newUserId

const load = (name) => {
  const p = path.join(BACKUP, `${name}.json`);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : [];
};
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const remap = (row, cols) => {
  const r = { ...row };
  for (const c of cols) if (r[c] != null) r[c] = userIdMap.get(r[c]) ?? null;
  return r;
};

// ---------------------------------------------------------------------------
// Step 1 + 2: auth users + public.users profiles
// ---------------------------------------------------------------------------
async function importUsers() {
  const users = load('users');
  console.log(`\n👤 Users: ${users.length} to migrate`);

  // Build a lookup of users already present in the new project (for re-runs).
  const existing = new Map();
  let page = 1;
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    for (const u of data.users) {
      if (u.email) existing.set(`e:${u.email.toLowerCase()}`, u);
      if (u.phone) existing.set(`p:${u.phone}`, u);
    }
    if (data.users.length < 1000) break;
    page++;
  }

  let created = 0, reused = 0, failed = 0;
  for (const u of users) {
    const emailKey = u.email ? `e:${String(u.email).toLowerCase()}` : null;
    const phoneKey = u.phone ? `p:${u.phone}` : null;
    let dest = (emailKey && existing.get(emailKey)) || (phoneKey && existing.get(phoneKey));

    if (!dest) {
      const payload = {
        email_confirm: true,
        password: TEMP_PASSWORD,
        user_metadata: { business_name: u.name, phone: u.phone, role: u.role },
      };
      if (u.email) payload.email = u.email;
      else if (u.phone) { payload.phone = u.phone; payload.phone_confirm = true; }
      else { console.log(`   ⚠️  user ${u.id} has no email/phone — skipped`); failed++; continue; }

      const { data, error } = await db.auth.admin.createUser(payload);
      if (error) { console.log(`   ❌ ${u.email || u.phone}: ${error.message}`); failed++; continue; }
      dest = data.user;
      created++;
    } else {
      reused++;
    }
    userIdMap.set(u.id, dest.id);

    // Overwrite the auto-created public.users row with exact backed-up profile.
    await db.from('users').update({
      name: u.name, phone: u.phone, role: u.role, active: u.active,
      email: u.email, email_verified: u.email_verified, phone_verified: u.phone_verified,
    }).eq('id', dest.id);
  }
  console.log(`   ✅ ${created} created · ♻️  ${reused} reused · ❌ ${failed} failed · mapped ${userIdMap.size}`);
}

// ---------------------------------------------------------------------------
// Generic table importer (preserve PKs; optional user-FK remap; optional wipe)
// ---------------------------------------------------------------------------
async function importTable(name, { remapCols = [], wipeFirst = false } = {}) {
  const rows = load(name);
  if (!rows.length) { console.log(`   ·  ${name.padEnd(22)} 0 rows (skip)`); return; }

  if (wipeFirst) {
    // Remove schema-seeded rows so they don't duplicate our backup rows.
    const { error } = await db.from(name).delete().not('id', 'is', null);
    if (error) console.log(`   ⚠️  wipe ${name}: ${error.message}`);
  }

  const prepared = remapCols.length ? rows.map((r) => remap(r, remapCols)) : rows;
  let ok = 0, fail = 0;
  for (const batch of chunk(prepared, 500)) {
    const { error } = await db.from(name).upsert(batch, { onConflict: 'id' });
    if (error) { fail += batch.length; console.log(`   ❌ ${name}: ${error.message}`); }
    else ok += batch.length;
  }
  console.log(`   ${fail ? '⚠️ ' : '✅'} ${name.padEnd(22)} ${ok} upserted${fail ? ` · ${fail} failed` : ''}`);
}

async function main() {
  console.log('🚚 Skymap — Import backup → NEW project');
  console.log('═'.repeat(55));
  console.log(`📍 Target: ${URL}`);

  // Sanity: confirm schema exists.
  const { error: probe } = await db.from('users').select('id').limit(1);
  if (probe) {
    console.error(`\n❌ Cannot read public.users on the new project: ${probe.message}`);
    console.error('   Run the SCHEMA first (database/_apply_all.sql in SQL Editor, or npm run migrate).');
    process.exit(1);
  }

  await importUsers();

  console.log('\n📥 Reference & content tables');
  await importTable('regions');
  await importTable('districts');
  await importTable('expense_categories', { wipeFirst: true });
  await importTable('delivery_fee_packages', { wipeFirst: true });
  await importTable('sms_templates', { wipeFirst: true });
  await importTable('company_profile', { wipeFirst: true });
  await importTable('payment_instructions', { wipeFirst: true });
  await importTable('slider_images');
  await importTable('cms_content', { remapCols: ['updated_by'] });

  console.log('\n📥 Core business data');
  await importTable('businesses', { remapCols: ['user_id'] });
  await importTable('user_permissions', { remapCols: ['user_id'] });
  await importTable('deliveries', { remapCols: ['assigned_rider_id', 'created_by'] });
  await importTable('delivery_events', { remapCols: ['created_by'] });
  await importTable('charges');
  await importTable('expenses', { remapCols: ['created_by'] });
  await importTable('invoices', { remapCols: ['created_by'] });
  await importTable('invoice_items');

  console.log('\n📥 Messaging');
  await importTable('sms_broadcasts', { remapCols: ['sent_by'] });
  await importTable('sms_logs');
  // otp_codes intentionally skipped — transient one-time codes, no value to import.

  console.log('\n' + '═'.repeat(55));
  console.log('🏁 Import complete.');
  console.log(`🔑 All users have temp password: "${TEMP_PASSWORD}" — tell them to reset, or trigger your OTP flow.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
