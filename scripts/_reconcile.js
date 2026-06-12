const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const c = new Client({ connectionString: process.env.NEW_DATABASE_URL, ssl: { rejectUnauthorized: false } });
const BACKUP = path.join(__dirname, '..', 'backup');

(async () => {
  await c.connect();
  const files = fs.readdirSync(BACKUP).filter(f => f.endsWith('.json') && f !== '_manifest.json').sort();
  let allGood = true, totBackup = 0, totMatched = 0;
  console.log('TABLE'.padEnd(24), 'BACKUP'.padStart(7), 'IN DB'.padStart(7), 'MATCHED'.padStart(8), '  STATUS');
  console.log('-'.repeat(64));
  for (const f of files) {
    const table = f.replace('.json', '');
    const rows = JSON.parse(fs.readFileSync(path.join(BACKUP, f), 'utf-8'));
    const backupN = rows.length;
    totBackup += backupN;
    // total in DB
    let dbN = 0, matched = 0;
    try {
      dbN = (await c.query(`select count(*)::int n from public.${table}`)).rows[0].n;
      if (backupN > 0 && rows[0].id !== undefined) {
        const ids = rows.map(r => String(r.id));
        matched = (await c.query(`select count(*)::int n from public.${table} where id::text = any($1)`, [ids])).rows[0].n;
      } else { matched = backupN === 0 ? 0 : dbN; }
    } catch (e) {
      console.log(table.padEnd(24), 'ERROR:', e.message.slice(0, 40)); allGood = false; continue;
    }
    totMatched += matched;
    let status;
    if (table === 'otp_codes') status = '⏭️  skipped (transient)';
    else if (backupN === 0) status = '- empty in source';
    else if (matched === backupN) status = '✅ all present';
    else { status = `⚠️  MISSING ${backupN - matched}`; allGood = false; }
    console.log(table.padEnd(24), String(backupN).padStart(7), String(dbN).padStart(7), String(matched).padStart(8), '  ' + status);
  }
  console.log('-'.repeat(64));
  console.log(`Backup rows (excl. otp): ${totBackup} | matched in DB: ${totMatched}`);
  console.log(allGood ? '\n🎉 RECONCILED - every backed-up row is present in the new database.' : '\n⚠️  Discrepancies found above.');
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
