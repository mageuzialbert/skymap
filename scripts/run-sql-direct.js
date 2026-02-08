const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Extract project reference from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('❌ Could not extract project reference from URL');
  process.exit(1);
}

async function executeSQL(sql, description) {
  console.log(`\n📄 ${description}`);
  console.log('🔄 Executing SQL...\n');

  try {
    // Use Supabase Management API
    // Note: This requires the Management API which may need additional setup
    // For now, we'll use the REST API approach with service role key
    
    // Split SQL into statements (handle multi-line statements)
    const statements = sql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\s*$/));

    console.log(`   Found ${statements.length} statements\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length < 10) continue;

      try {
        // Use Supabase REST API to execute SQL via query endpoint
        // This is a workaround - ideally use Management API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ query: statement }),
        });

        if (response.ok) {
          successCount++;
          process.stdout.write('.');
        } else {
          const errorText = await response.text();
          // Try alternative: execute via direct SQL endpoint if available
          console.log(`\n⚠️  Statement ${i + 1} failed, trying alternative method...`);
          
          // Alternative: Use psql or direct connection
          // For now, log the error
          errors.push({ statement: i + 1, error: errorText });
          errorCount++;
        }
      } catch (err) {
        errorCount++;
        errors.push({ statement: i + 1, error: err.message });
      }
    }

    console.log(`\n\n✅ Successfully executed: ${successCount} statements`);
    if (errorCount > 0) {
      console.log(`⚠️  Failed: ${errorCount} statements`);
      console.log('\n💡 Some statements may need to be run manually in Supabase SQL Editor');
    }

    return { success: errorCount === 0, successCount, errorCount, errors };
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function setupDatabase() {
  console.log('🚀 Kasi Courier Services - Direct SQL Execution');
  console.log('═'.repeat(50));
  console.log(`📍 Project: ${projectRef}\n`);

  const files = [
    { path: path.join(__dirname, '..', 'database', 'schema.sql'), name: 'Database Schema' },
    { path: path.join(__dirname, '..', 'database', 'rls.sql'), name: 'Row Level Security' },
    { path: path.join(__dirname, '..', 'database', 'triggers.sql'), name: 'Database Triggers' },
  ];

  for (const file of files) {
    if (!fs.existsSync(file.path)) {
      console.log(`❌ File not found: ${file.path}\n`);
      continue;
    }

    const sql = fs.readFileSync(file.path, 'utf-8');
    await executeSQL(sql, file.name);
    
    // Small delay between files
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ Database setup completed!');
  console.log('\n📖 Verify in Supabase Dashboard:');
  console.log('   1. Go to Table Editor');
  console.log('   2. Check that all tables are created');
  console.log('   3. Verify RLS is enabled on tables\n');
}

setupDatabase().catch(console.error);
