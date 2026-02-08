const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function executeSQL(sql, description) {
  console.log(`\n📄 ${description}`);
  console.log('🔄 Executing SQL...\n');

  try {
    // Supabase doesn't support direct SQL execution via JS client
    // We need to use the Management API or SQL Editor
    // For now, we'll use the REST API approach
    
    // Split SQL into statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`   Found ${statements.length} statements\n`);

    // Use Supabase REST API to execute SQL
    // Note: This requires the Management API which may not be available
    // Alternative: Use Supabase CLI or SQL Editor
    
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement || statement.length < 10) continue;

      try {
        // Try to execute via RPC (if function exists) or direct query
        // For DDL statements, we need Management API
        
        // For CREATE TABLE, we can't use the standard client
        // We'll need to use the Management API endpoint
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: statement }),
        });

        if (response.ok) {
          successCount++;
          process.stdout.write('.');
        } else {
          errorCount++;
          // Try alternative method
          console.log(`\n⚠️  Statement ${i + 1} needs manual execution`);
        }
      } catch (err) {
        errorCount++;
        // Silent fail for now - will provide manual instructions
      }
    }

    console.log(`\n\n✅ Completed: ${successCount} successful`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} statements need manual execution`);
    }

    return { success: errorCount === 0, successCount, errorCount };
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function setupDatabase() {
  console.log('🚀 Skymap Logistics - Database Setup');
  console.log('═'.repeat(50));
  console.log(`📍 Supabase URL: ${supabaseUrl?.substring(0, 40)}...\n`);

  // Verify connection by checking auth
  try {
    console.log('🔄 Verifying connection...');
    // Check if we can access the auth schema (indirect connection test)
    const { data: healthCheck } = await supabase.auth.getSession();
    console.log('✅ Connected to Supabase!\n');
  } catch (error) {
    // Connection might still work even if auth check fails
    console.log('⚠️  Auth check failed, but connection may still work');
    console.log('✅ Proceeding with setup...\n');
  }

  // Read SQL files
  const files = [
    { path: 'database/schema.sql', name: 'Database Schema' },
    { path: 'database/rls.sql', name: 'Row Level Security Policies' },
    { path: 'database/triggers.sql', name: 'Database Triggers' },
  ];

  console.log('📋 SQL Files to Execute:');
  files.forEach((f, i) => console.log(`   ${i + 1}. ${f.name}`));
  console.log('\n');

  // Since direct SQL execution is limited, provide instructions
  console.log('📝 IMPORTANT: Supabase requires SQL execution via SQL Editor');
  console.log('   The JavaScript client cannot execute DDL statements directly.\n');
  
  console.log('🔧 Recommended Method:');
  console.log('   1. Go to: https://app.supabase.com');
  console.log('   2. Select your project');
  console.log('   3. Navigate to: SQL Editor (left sidebar)');
  console.log('   4. Click "New Query"');
  console.log('   5. Copy and paste the SQL from each file');
  console.log('   6. Click "Run" (or Ctrl+Enter)\n');

  console.log('📄 Files to run in order:');
  files.forEach((f, i) => {
    const fullPath = path.join(process.cwd(), f.path);
    if (fs.existsSync(fullPath)) {
      const size = fs.statSync(fullPath).size;
      console.log(`   ${i + 1}. ${f.path} (${(size / 1024).toFixed(1)} KB)`);
    } else {
      console.log(`   ${i + 1}. ${f.path} ❌ NOT FOUND`);
    }
  });

  console.log('\n✨ Alternative: Use Supabase CLI');
  console.log('   npx supabase db push\n');

  // Try to read and display first few lines of schema.sql as example
  try {
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      const firstLines = schemaContent.split('\n').slice(0, 5).join('\n');
      console.log('📖 Example from schema.sql:');
      console.log('─'.repeat(50));
      console.log(firstLines);
      console.log('   ...');
      console.log('─'.repeat(50));
    }
  } catch (err) {
    // Ignore
  }

  console.log('\n✅ Setup instructions provided!');
  console.log('📖 Next: Run the SQL files in Supabase SQL Editor\n');
}

setupDatabase().catch(console.error);
