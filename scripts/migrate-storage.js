#!/usr/bin/env node
/*
 * Copy Storage files from the OLD Supabase project to the NEW one, then rewrite
 * the file URLs stored in the NEW database so they point at the new project.
 *
 * OLD project: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY  (already in .env)
 * NEW project: NEW_SUPABASE_URL + NEW_SUPABASE_SERVICE_ROLE_KEY      (add the key to .env)
 * URL rewrite: NEW_DATABASE_URL (direct Postgres)
 *
 * Flags:
 *   --dry          list what would be copied/rewritten, do nothing
 *   --no-rewrite   copy files but skip the DB URL rewrite
 *
 * Re-runnable: uploads use upsert; URL rewrite is a string replace.
 */

const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const OLD_URL = process.env.OLD_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
// During cutover SUPABASE_SERVICE_ROLE_KEY may already point at the NEW project,
// so prefer an explicit OLD key when provided.
const OLD_KEY = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const NEW_URL = process.env.NEW_SUPABASE_URL;
const NEW_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;
const CONN = process.env.NEW_DATABASE_URL;

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const NO_REWRITE = args.includes('--no-rewrite');

const oldRef = (OLD_URL || '').match(/https:\/\/([^.]+)\./)?.[1];
const newRef = (NEW_URL || '').match(/https:\/\/([^.]+)\./)?.[1];

const h = (key) => ({ apikey: key, Authorization: `Bearer ${key}` });

async function listBucket(name) {
  const r = await fetch(`${OLD_URL}/storage/v1/object/list/${name}`, {
    method: 'POST', headers: { ...h(OLD_KEY), 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: '', limit: 10000, sortBy: { column: 'name', order: 'asc' } }),
  });
  const objs = await r.json();
  return (Array.isArray(objs) ? objs : []).filter((o) => o.id !== null).map((o) => o.name);
}

async function ensureBucket(name, isPublic) {
  // The schema already created these, but make idempotent for safety.
  const r = await fetch(`${NEW_URL}/storage/v1/bucket`, {
    method: 'POST', headers: { ...h(NEW_KEY), 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: name, name, public: isPublic }),
  });
  if (!r.ok) { const t = await r.text(); if (!/already exists/i.test(t)) console.log(`   (bucket ${name}: ${t.slice(0,80)})`); }
}

async function copyFile(bucket, name) {
  // Download from OLD (authenticated works for public + private buckets).
  const dl = await fetch(`${OLD_URL}/storage/v1/object/${bucket}/${encodeURIComponent(name)}`, { headers: h(OLD_KEY) });
  if (!dl.ok) throw new Error(`download ${dl.status}`);
  const buf = Buffer.from(await dl.arrayBuffer());
  const ct = dl.headers.get('content-type') || 'application/octet-stream';
  // Upload to NEW with upsert.
  const up = await fetch(`${NEW_URL}/storage/v1/object/${bucket}/${encodeURIComponent(name)}`, {
    method: 'POST', headers: { ...h(NEW_KEY), 'Content-Type': ct, 'x-upsert': 'true' }, body: buf,
  });
  if (!up.ok) throw new Error(`upload ${up.status}: ${(await up.text()).slice(0, 80)}`);
  return buf.length;
}

async function rewriteUrls() {
  if (!CONN) { console.log('\n⚠️  NEW_DATABASE_URL not set — skipping URL rewrite.'); return; }
  if (!oldRef || !newRef) { console.log('\n⚠️  Could not derive project refs — skipping URL rewrite.'); return; }
  const db = new Client({ connectionString: CONN, ssl: { rejectUnauthorized: false } });
  await db.connect();
  const targets = [
    ['slider_images', 'image_url'], ['businesses', 'logo_url'], ['deliveries', 'package_image_url'],
    ['company_profile', 'logo_url'], ['company_profile', 'favicon_url'],
  ];
  console.log(`\n🔗 Rewriting URLs: ${oldRef} → ${newRef}`);
  for (const [t, c] of targets) {
    const r = await db.query(
      `update ${t} set ${c} = replace(${c}, $1, $2) where ${c} like $3`,
      [oldRef, newRef, `%${oldRef}%`]
    );
    if (r.rowCount) console.log(`   ${t}.${c}: ${r.rowCount} rows updated`);
  }
  // cms_content jsonb
  const cms = await db.query(
    `update cms_content set content = replace(content::text, $1, $2)::jsonb where content::text like $3`,
    [oldRef, newRef, `%${oldRef}%`]
  );
  if (cms.rowCount) console.log(`   cms_content.content: ${cms.rowCount} rows updated`);
  await db.end();
}

async function main() {
  console.log('🗂️  Skymap — Storage migration (OLD → NEW)');
  console.log('═'.repeat(55));
  if (!OLD_URL || !OLD_KEY) { console.error('❌ OLD project creds missing'); process.exit(1); }

  // Discover OLD buckets + objects.
  const blist = await (await fetch(`${OLD_URL}/storage/v1/bucket`, { headers: h(OLD_KEY) })).json();
  const buckets = (Array.isArray(blist) ? blist : []).map((b) => ({ name: b.id, public: b.public }));
  const plan = [];
  for (const b of buckets) {
    const files = await listBucket(b.name);
    if (files.length) plan.push({ ...b, files });
  }
  const totalFiles = plan.reduce((s, b) => s + b.files.length, 0);
  console.log(`Found ${totalFiles} files across ${plan.length} non-empty buckets:`);
  plan.forEach((b) => console.log(`  - ${b.name} (${b.files.length})`));

  if (DRY) {
    console.log('\n🔍 DRY RUN — nothing copied.');
    if (!CONN) console.log('   (URL rewrite would also run if NEW_DATABASE_URL were set.)');
    return;
  }

  if (!NEW_URL || !NEW_KEY) {
    console.error(`\n❌ NEW project credentials missing. Add to .env:
    NEW_SUPABASE_SERVICE_ROLE_KEY=<new project → Settings → API → service_role>
  (NEW_SUPABASE_URL is already set.) Then re-run: node scripts/migrate-storage.js`);
    process.exit(1);
  }

  let copied = 0, failed = 0;
  for (const b of plan) {
    await ensureBucket(b.name, b.public);
    console.log(`\n📦 ${b.name}`);
    for (const name of b.files) {
      try { const n = await copyFile(b.name, name); copied++; process.stdout.write('.'); void n; }
      catch (e) { failed++; console.log(`\n   ❌ ${name}: ${e.message}`); }
    }
  }
  console.log(`\n\n✅ Copied ${copied} · ❌ failed ${failed}`);

  if (!NO_REWRITE) await rewriteUrls();
  console.log('\n🏁 Storage migration done.');
}

main().catch((e) => { console.error('\n❌', e.message); process.exit(1); });
