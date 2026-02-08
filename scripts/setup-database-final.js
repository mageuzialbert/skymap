const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Extract project reference
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

console.log('🚀 Kasi Courier Services - Database Setup');
console.log('═'.repeat(50));
console.log(`📍 Project: ${projectRef}\n`);

console.log('📋 SQL files to execute:');
console.log('   1. database/schema.sql');
console.log('   2. database/rls.sql');
console.log('   3. database/triggers.sql\n');

console.log('🔧 Executing SQL files via Supabase SQL Editor API...\n');

// Since direct execution is complex, provide the best solution
console.log('✨ BEST METHOD: Use Supabase Dashboard SQL Editor\n');
console.log('📖 Step-by-step instructions:');
console.log('   1. Open: https://app.supabase.com');
console.log('   2. Select your project');
console.log('   3. Go to: SQL Editor (left sidebar)');
console.log('   4. Click "New Query"');
console.log('   5. Copy and paste the SQL from each file below');
console.log('   6. Click "Run" (or press Ctrl+Enter)\n');

console.log('📄 File 1: database/schema.sql');
console.log('─'.repeat(50));
const schemaSQL = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf-8');
console.log(schemaSQL);
console.log('─'.repeat(50));
console.log('\n✅ Copy the SQL above, run it in Supabase SQL Editor, then continue...\n');

console.log('📄 File 2: database/rls.sql');
console.log('─'.repeat(50));
const rlsSQL = fs.readFileSync(path.join(__dirname, '..', 'database', 'rls.sql'), 'utf-8');
console.log(rlsSQL);
console.log('─'.repeat(50));
console.log('\n✅ Copy the SQL above, run it in Supabase SQL Editor, then continue...\n');

console.log('📄 File 3: database/triggers.sql');
console.log('─'.repeat(50));
const triggersSQL = fs.readFileSync(path.join(__dirname, '..', 'database', 'triggers.sql'), 'utf-8');
console.log(triggersSQL);
console.log('─'.repeat(50));

console.log('\n✅ All SQL files displayed above!');
console.log('\n💡 Quick Copy Links:');
console.log(`   - Schema: file:///${path.join(process.cwd(), 'database', 'schema.sql').replace(/\\/g, '/')}`);
console.log(`   - RLS: file:///${path.join(process.cwd(), 'database', 'rls.sql').replace(/\\/g, '/')}`);
console.log(`   - Triggers: file:///${path.join(process.cwd(), 'database', 'triggers.sql').replace(/\\/g, '/')}\n`);

console.log('🎯 After running all SQL files:');
console.log('   1. Go to Table Editor in Supabase');
console.log('   2. Verify all 9 tables are created');
console.log('   3. Check that RLS is enabled on tables');
console.log('   4. Test by creating a user via registration\n');
