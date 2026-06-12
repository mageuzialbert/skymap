const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const BACKUP = path.join(__dirname, '..', 'backup');

(async () => {
  await c.connect();
  const files = fs.readdirSync(BACKUP).filter(f => f.endsWith('.json') && f !== '_manifest.json');
  for (const f of files) {
    const table = f.replace('.json', '');
    const rows = JSON.parse(fs.readFileSync(path.join(BACKUP, f), 'utf-8'));
    if (!rows.length) { console.log(`\n${table}: (0 rows, skip)`); continue; }
    const jsonKeys = new Set(Object.keys(rows[0]));
    const res = await c.query(
      'select column_name from information_schema.columns where table_schema=$1 and table_name=$2',
      ['public', table]
    );
    if (!res.rows.length) { console.log(`\n❌ ${table}: TABLE MISSING in new DB`); continue; }
    const dbCols = new Set(res.rows.map(r => r.column_name));
    const missingInDb = [...jsonKeys].filter(k => !dbCols.has(k));   // backup has, DB lacks -> DATA LOSS
    if (missingInDb.length) console.log(`\n⚠️  ${table}: columns in backup but NOT in new DB -> ${missingInDb.join(', ')}`);
  }
  await c.end();
  console.log('\n(done - only drift shown above)');
})().catch(e => { console.error(e.message); process.exit(1); });
