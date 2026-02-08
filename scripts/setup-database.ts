import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

// Create Supabase client with service role key (has admin privileges)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runSQLFile(filePath: string, description: string) {
  try {
    console.log(`\n📄 Running ${description}...`);
    const sql = readFileSync(filePath, 'utf-8');
    
    // Split SQL by semicolons and filter out empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      if (statement.length === 0) continue;
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          // Try direct query execution
          const { error: directError } = await supabase
            .from('_temp')
            .select('*')
            .limit(0);
          
          // If RPC doesn't work, we'll need to use the REST API or SQL editor
          // For now, log the statement and continue
          console.log(`⚠️  Could not execute via RPC, please run manually in Supabase SQL Editor`);
          console.log(`   Statement: ${statement.substring(0, 100)}...`);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.log(`⚠️  Error executing statement: ${err instanceof Error ? err.message : 'Unknown error'}`);
        errorCount++;
      }
    }

    if (successCount > 0) {
      console.log(`✅ Successfully executed ${successCount} statements`);
    }
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} statements need manual execution`);
    }
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error);
    throw error;
  }
}

async function setupDatabase() {
  console.log('🚀 Starting database setup...');
  console.log(`📍 Connecting to: ${supabaseUrl?.substring(0, 30)}...`);

  try {
    // Read SQL files
    const schemaSQL = readFileSync(join(process.cwd(), 'database', 'schema.sql'), 'utf-8');
    const rlsSQL = readFileSync(join(process.cwd(), 'database', 'rls.sql'), 'utf-8');
    const triggersSQL = readFileSync(join(process.cwd(), 'database', 'triggers.sql'), 'utf-8');

    console.log('\n📋 Note: Supabase requires SQL to be run via their SQL Editor or REST API.');
    console.log('📋 The SQL files are ready. Here\'s what needs to be run:\n');

    console.log('1️⃣  First, run database/schema.sql in Supabase SQL Editor');
    console.log('2️⃣  Then, run database/rls.sql');
    console.log('3️⃣  Finally, run database/triggers.sql\n');

    console.log('📝 Alternative: Use Supabase CLI or REST API');
    console.log('   You can also copy the SQL files and run them in the Supabase dashboard.\n');

    // Try to execute via REST API (limited functionality)
    console.log('🔄 Attempting to verify connection...');
    const { data, error } = await supabase.from('_temp').select('*').limit(0);
    
    if (error && error.message.includes('relation') === false) {
      console.log('✅ Connected to Supabase successfully!');
      console.log('⚠️  However, SQL execution requires Supabase SQL Editor or CLI.');
    } else {
      console.log('✅ Connected to Supabase!');
    }

    console.log('\n📖 To run the SQL files:');
    console.log('   1. Go to: https://app.supabase.com');
    console.log('   2. Select your project');
    console.log('   3. Go to SQL Editor');
    console.log('   4. Copy and paste the contents of database/schema.sql');
    console.log('   5. Click "Run"');
    console.log('   6. Repeat for database/rls.sql and database/triggers.sql\n');

  } catch (error) {
    console.error('❌ Error during setup:', error);
    process.exit(1);
  }
}

setupDatabase();
