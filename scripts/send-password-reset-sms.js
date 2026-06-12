#!/usr/bin/env node
/*
 * Notify users about the DB migration: they log in with their existing email
 * and a temporary password, then change it.
 *
 * SAFE BY DEFAULT: previews only. Add --send to actually send SMS.
 *
 * Flags:
 *   (no flag)        dry run - print recipients + message, send nothing
 *   --send           actually send via the iPAB gateway + log to sms_logs
 *   --test 0712...   send to ONE number only (great for a real-world check)
 *   --role BUSINESS  filter recipients by role (default: all active users)
 *   --limit N        cap recipient count
 *
 * Reads recipients from the NEW DB (NEW_DATABASE_URL). Uses the same iPAB
 * gateway/credentials as lib/sms.ts (SMS_API_URL / SMS_API_TOKEN / SMS_SENDER_ID).
 */

const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const SMS_API_URL = process.env.SMS_API_URL || 'https://smartsms.ipab.co.tz/api/v3/sms/send';
const SMS_API_TOKEN = process.env.SMS_API_TOKEN;
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || 'iPAB';
const TEMP_PASSWORD = process.env.IMPORT_TEMP_PASSWORD || 'ChangeMe!2026';
const CONN = process.env.NEW_DATABASE_URL;

const args = process.argv.slice(2);
const SEND = args.includes('--send');
const TEST = args.includes('--test') ? args[args.indexOf('--test') + 1] : null;
const ROLE = args.includes('--role') ? args[args.indexOf('--role') + 1] : null;
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : null;

const normalize = (p) => {
  let n = String(p).replace(/\D/g, '');
  if (n.startsWith('0') && n.length === 10) n = '255' + n.slice(1);
  return n;
};
const buildMessage = (name) =>
  `Dear ${name || 'Customer'}, The Skymap has upgraded its system. Log in with your email and temporary password: ${TEMP_PASSWORD} then change it in Settings. All your data is safe.`;

async function sendOne(phone, message) {
  const res = await fetch(SMS_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SMS_API_TOKEN}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ recipient: normalize(phone), sender_id: SMS_SENDER_ID, type: 'plain', message }),
  });
  let body; try { body = await res.json(); } catch { body = await res.text(); }
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  if (!CONN) { console.error('❌ NEW_DATABASE_URL not set in .env'); process.exit(1); }
  const db = new Client({ connectionString: CONN, ssl: { rejectUnauthorized: false } });
  await db.connect();

  let recipients;
  if (TEST) {
    recipients = [{ name: 'Test', phone: TEST }];
  } else {
    const where = ['active = true', 'phone is not null', "phone <> ''"];
    const params = [];
    if (ROLE) { params.push(ROLE); where.push(`role = $${params.length}`); }
    let sql = `select name, phone, role from users where ${where.join(' and ')} order by role, name`;
    if (LIMIT) sql += ` limit ${LIMIT}`;
    recipients = (await db.query(sql, params)).rows;
  }

  console.log('📣 Password-reset SMS broadcast');
  console.log('═'.repeat(55));
  console.log(`Gateway : ${SMS_API_URL}  (sender ${SMS_SENDER_ID})`);
  console.log(`Mode    : ${SEND ? '🚨 LIVE SEND' : '🔍 DRY RUN (no SMS sent)'}${TEST ? `  [TEST → ${TEST}]` : ''}`);
  console.log(`Recipients: ${recipients.length}\n`);
  console.log('Sample message:');
  console.log('  "' + buildMessage(recipients[0]?.name) + `"  (${buildMessage(recipients[0]?.name).length} chars)\n`);

  if (!SEND) {
    recipients.slice(0, 30).forEach((r, i) => console.log(`  ${String(i + 1).padStart(3)}. ${normalize(r.phone).padEnd(14)} ${r.role || ''}  ${r.name || ''}`));
    if (recipients.length > 30) console.log(`  …and ${recipients.length - 30} more`);
    console.log('\n(No SMS sent. Re-run with --send to broadcast, or --test <phone> for a single live check.)');
    await db.end();
    return;
  }

  if (!SMS_API_TOKEN) { console.error('❌ SMS_API_TOKEN missing'); process.exit(1); }
  let ok = 0, fail = 0;
  for (const r of recipients) {
    const msg = buildMessage(r.name);
    try {
      const res = await sendOne(r.phone, msg);
      await db.query('insert into sms_logs (to_phone, message, status, provider_response) values ($1,$2,$3,$4)',
        [r.phone, msg, res.ok ? 'success' : 'failed', JSON.stringify(res.body)]);
      if (res.ok) { ok++; process.stdout.write('.'); } else { fail++; process.stdout.write('x'); }
    } catch (e) {
      fail++; process.stdout.write('x');
      await db.query('insert into sms_logs (to_phone, message, status, provider_response) values ($1,$2,$3,$4)',
        [r.phone, msg, 'failed', String(e.message)]);
    }
  }
  if (!TEST) {
    await db.query(
      `insert into sms_broadcasts (subject, body, recipient_type, total_sent, total_failed) values ($1,$2,$3,$4,$5)`,
      ['System upgrade - password reset', buildMessage('{name}'), 'all_clients', ok, fail]
    );
  }
  console.log(`\n\n✅ Sent ${ok} · ❌ failed ${fail}`);
  await db.end();
}

main().catch((e) => { console.error('\n❌', e.message); process.exit(1); });
