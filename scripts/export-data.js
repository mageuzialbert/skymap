#!/usr/bin/env node
/*
 * Export all public-schema data from the Supabase project via the REST API
 * (service-role key bypasses RLS). Writes one JSON file per table to ./backup/.
 *
 * NOTE: this CANNOT export the `auth` schema (auth.users / password hashes) —
 * that is not reachable through the REST API. This is a data backup, not a
 * basis for seamless auth re-hosting.
 *
 * Usage: node scripts/export-data.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAGE = 1000;
const OUT_DIR = path.join(__dirname, '..', 'backup');

if (!URL || !KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// Known public tables (fallback if auto-discovery fails).
const KNOWN_TABLES = [
  'regions', 'districts',
  'users', 'businesses',
  'deliveries', 'delivery_events', 'charges',
  'invoices', 'invoice_items',
  'delivery_fee_packages', 'payment_instructions',
  'expense_categories', 'expenses',
  'sms_logs', 'sms_templates', 'sms_broadcasts', 'otp_codes',
  'slider_images', 'cms_content', 'company_profile',
];

// Try to enumerate every exposed table from the PostgREST OpenAPI root.
async function discoverTables() {
  try {
    const res = await fetch(`${URL}/rest/v1/`, { headers });
    if (!res.ok) return null;
    const spec = await res.json();
    const paths = spec.paths || {};
    const tables = Object.keys(paths)
      .filter((p) => /^\/[A-Za-z0-9_]+$/.test(p)) // "/table" only
      .map((p) => p.slice(1))
      .filter((t) => t && t !== 'rpc');
    return tables.length ? [...new Set(tables)] : null;
  } catch {
    return null;
  }
}

async function fetchAll(table) {
  const rows = [];
  let from = 0;
  for (;;) {
    const to = from + PAGE - 1;
    const res = await fetch(`${URL}/rest/v1/${table}?select=*`, {
      headers: { ...headers, Range: `${from}-${to}`, Prefer: 'count=exact' },
    });
    if (res.status === 404) return { rows: null, missing: true };
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
    }
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return { rows, missing: false };
}

async function main() {
  console.log('📦 Skymap — Public Data Export');
  console.log('═'.repeat(55));
  console.log(`📍 Project: ${URL}`);

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const discovered = await discoverTables();
  const tables = discovered || KNOWN_TABLES;
  console.log(`🔎 ${discovered ? 'Discovered' : 'Using known list of'} ${tables.length} tables\n`);

  const manifest = {};
  let totalRows = 0;
  for (const table of tables) {
    try {
      const { rows, missing } = await fetchAll(table);
      if (missing) { console.log(`  ⚠️  ${table.padEnd(24)} not found (skipped)`); continue; }
      const file = path.join(OUT_DIR, `${table}.json`);
      fs.writeFileSync(file, JSON.stringify(rows, null, 2));
      manifest[table] = rows.length;
      totalRows += rows.length;
      console.log(`  ✅ ${table.padEnd(24)} ${String(rows.length).padStart(6)} rows`);
    } catch (err) {
      console.log(`  ❌ ${table.padEnd(24)} ${err.message}`);
    }
  }

  fs.writeFileSync(
    path.join(OUT_DIR, '_manifest.json'),
    JSON.stringify({ project: URL, exported_tables: manifest, total_rows: totalRows }, null, 2)
  );

  console.log('\n' + '═'.repeat(55));
  console.log(`🏁 Exported ${Object.keys(manifest).length} tables · ${totalRows} rows → backup/`);
  console.log('⚠️  Reminder: auth.users (logins/passwords) is NOT included — REST cannot reach it.');
}

main().catch((e) => { console.error(e); process.exit(1); });
