const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

async function executeSQLFile(filePath, description) {
  console.log(`\n📄 ${description}`);
  console.log('─'.repeat(50));

  try {
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    // Use Supabase Management API to execute SQL
    // This requires the project's access token or service role key
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    
    if (!projectRef) {
      console.log('⚠️  Could not extract project reference from URL');
      console.log('📋 Please run this SQL manually in Supabase SQL Editor:\n');
      console.log(sql);
      return false;
    }

    // Try using the Management API
    // Note: This requires additional setup with Supabase Access Token
    // For now, we'll provide the SQL ready to copy
    
    console.log('📋 SQL Content (ready to copy):\n');
    console.log('─'.repeat(50));
    console.log(sql);
    console.log('─'.repeat(50));
    console.log('\n💡 Copy the SQL above and run it in Supabase SQL Editor\n');
    
    return true;
  } catch (error) {
    console.error(`❌ Error reading file: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Kasi Courier Services - SQL Execution');
  console.log('═'.repeat(50));
  console.log(`📍 Project: ${supabaseUrl?.substring(0, 50)}...\n`);

  const files = [
    { path: path.join(__dirname, '..', 'database', 'schema.sql'), name: '1. Database Schema (Run First)' },
    { path: path.join(__dirname, '..', 'database', 'rls.sql'), name: '2. Row Level Security Policies (Run Second)' },
    { path: path.join(__dirname, '..', 'database', 'triggers.sql'), name: '3. Database Triggers (Run Third)' },
  ];

  console.log('📋 Executing SQL files in order...\n');

  for (const file of files) {
    if (!fs.existsSync(file.path)) {
      console.log(`❌ File not found: ${file.path}\n`);
      continue;
    }

    await executeSQLFile(file.path, file.name);
    
    console.log('\n⏸️  Press Enter after running this SQL in Supabase, then continue...');
    // In automated mode, we'll just show all files
  }

  console.log('\n✅ All SQL files prepared!');
  console.log('\n📖 Next Steps:');
  console.log('   1. Go to: https://app.supabase.com');
  console.log('   2. Select your project');
  console.log('   3. Go to: SQL Editor');
  console.log('   4. Run each SQL file in the order shown above');
  console.log('   5. Verify tables in Table Editor\n');
}

main().catch(console.error);
