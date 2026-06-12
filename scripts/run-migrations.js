// Run SQL migration files directly against Postgres via the session pooler.
// Usage: node scripts/run-migrations.js <file1.sql> [file2.sql ...]
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

const connectionString = process.env.NEW_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Missing NEW_DATABASE_URL in .env');
  process.exit(1);
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('❌ No migration files provided');
  process.exit(1);
}

async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('✅ Connected to database\n');

  for (const file of files) {
    const fullPath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${fullPath}`);
      process.exitCode = 1;
      continue;
    }
    const sql = fs.readFileSync(fullPath, 'utf-8');
    console.log(`📄 Running ${file} ...`);
    try {
      // Run the whole file as one simple query so dollar-quoted DO/function
      // blocks are handled correctly.
      await client.query(sql);
      console.log(`✅ ${file} applied\n`);
    } catch (err) {
      console.error(`❌ ${file} failed: ${err.message}\n`);
      process.exitCode = 1;
    }
  }

  // Tell Supabase PostgREST to refresh its schema cache so newly added
  // columns/tables are immediately visible to the API layer (avoids PGRST204
  // "Could not find the 'x' column ... in the schema cache").
  try {
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log("🔄 Reloaded PostgREST schema cache");
  } catch (err) {
    console.warn(`⚠️  Could not reload schema cache: ${err.message}`);
  }

  await client.end();
  console.log('Done.');
}

main().catch((err) => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
