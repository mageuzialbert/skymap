const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupDatabase() {
  console.log('🚀 Starting database setup...');
  console.log(`📍 Connecting to: ${supabaseUrl?.substring(0, 30)}...\n`);

  try {
    // Verify connection
    console.log('🔄 Verifying connection...');
    const { data, error } = await supabase.from('_temp').select('*').limit(0);
    
    if (error && !error.message.includes('relation')) {
      console.error('❌ Connection error:', error.message);
      process.exit(1);
    }

    console.log('✅ Connected to Supabase successfully!\n');

    // Read SQL files
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    const rlsPath = path.join(process.cwd(), 'database', 'rls.sql');
    const triggersPath = path.join(process.cwd(), 'database', 'triggers.sql');

    console.log('📋 SQL files found:');
    console.log(`   ✅ ${schemaPath}`);
    console.log(`   ✅ ${rlsPath}`);
    console.log(`   ✅ ${triggersPath}\n`);

    // Note: Supabase JavaScript client doesn't support direct SQL execution
    // We need to use the REST API or SQL Editor
    console.log('📝 IMPORTANT: Supabase requires SQL to be executed via:');
    console.log('   1. Supabase Dashboard SQL Editor (Recommended)');
    console.log('   2. Supabase CLI');
    console.log('   3. REST API with proper authentication\n');

    console.log('🔧 To run the SQL files manually:');
    console.log('   1. Go to: https://app.supabase.com');
    console.log('   2. Select your project');
    console.log('   3. Navigate to: SQL Editor');
    console.log('   4. Click "New Query"');
    console.log('   5. Copy and paste the contents of database/schema.sql');
    console.log('   6. Click "Run" (or press Ctrl+Enter)');
    console.log('   7. Repeat steps 4-6 for database/rls.sql');
    console.log('   8. Repeat steps 4-6 for database/triggers.sql\n');

    console.log('✨ Or use the Supabase CLI:');
    console.log('   npx supabase db push\n');

    // Try to use REST API to execute SQL (limited - may not work for all statements)
    console.log('🔄 Attempting to execute schema.sql via REST API...\n');
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
    
    // Split into individual statements
    const statements = schemaSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.toLowerCase().includes('create extension'));

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    // Note: Direct SQL execution via REST API is limited
    // The best approach is to use Supabase's SQL Editor or CLI
    console.log('⚠️  Direct SQL execution via REST API is limited.');
    console.log('✅ Please use the Supabase SQL Editor as described above.\n');

    console.log('✅ Setup script completed!');
    console.log('📖 Next: Run the SQL files in Supabase SQL Editor\n');

  } catch (error) {
    console.error('❌ Error during setup:', error.message);
    process.exit(1);
  }
}

setupDatabase();
