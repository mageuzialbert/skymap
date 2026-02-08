const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Source Credentials (from prompt)
const SRC_URL = 'https://qtjhwpivngilqxownfoj.supabase.co';
const SRC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0amh3cGl2bmdpbHF4b3duZm9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE4MzAzMywiZXhwIjoyMDgzNzU5MDMzfQ.ybp-i-djaTB7K3hJ-9buIBkQ9mNMZaNjHcfIrmC9kgY';

// Dest Credentials (from .env.local)
const DEST_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DEST_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('--- Migration Access Check ---');
console.log('Source:', SRC_URL);
console.log('Dest:', DEST_URL);

async function check() {
  const src = createClient(SRC_URL, SRC_KEY);
  const dest = createClient(DEST_URL, DEST_KEY);

  // 1. Check Source Users
  console.log('\nChecking Source Users...');
  const { data: srcUsers, error: srcUserErr } = await src.auth.admin.listUsers();
  if (srcUserErr) console.error('Error listing source users:', srcUserErr.message);
  else console.log(`Found ${srcUsers.users.length} users in Source.`);

  // 2. Check Source Tables (Public Users)
  console.log('\nChecking Source public.users...');
  const { data: srcPublicUsers, error: srcPubErr, count: srcPubCount } = await src
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  if (srcPubErr) console.error('Error accessing source public.users:', srcPubErr.message);
  else console.log(`Found ${srcPubCount} rows in source public.users.`);

  // 3. Check Dest Tables
  console.log('\nChecking Destination Tables...');
  
  // Check Dest Auth Users vs Public Users
  const { data: { users: destAuthUsers } } = await dest.auth.admin.listUsers({ perPage: 1000 });
  const { count: destPublicCount } = await dest.from('users').select('*', { count: 'exact', head: true });
  
  console.log(`Dest Auth Users: ${destAuthUsers.length}`);
  console.log(`Dest Public Users: ${destPublicCount}`);
  
  if (destAuthUsers.length !== destPublicCount) {
      console.log('⚠️  MISMATCH: Auth users and Public users counts differ. Triggers may have failed.');
  }

  const tables = ['users', 'businesses', 'deliveries', 'regions', 'districts'];
  
  for (const t of tables) {
    const { error } = await dest.from(t).select('id').limit(1);
    if (error) {
      if (error.code === '42P01') { // undefined_table
        console.log(`[MISSING] Table '${t}' does not exist in Destination.`);
      }
    } else {
      console.log(`[OK] Table '${t}' exists.`);
      
      // Check for logo_url in businesses
      if (t === 'businesses') {
         const { error: colErr } = await dest.from('businesses').select('logo_url').limit(1);
         if (colErr) console.log(`   [WARNING] 'businesses' missing 'logo_url'`);
         else console.log(`   [OK] 'businesses' has 'logo_url'`);

         const { error: addrErr } = await dest.from('businesses').select('address').limit(1);
         if (addrErr) console.log(`   [WARNING] 'businesses' missing 'address'`);
         else console.log(`   [OK] 'businesses' has 'address'`);
      }

      // Check for deliveries columns
      if (t === 'deliveries') {
          const cols = ['delivery_fee', 'pickup_latitude', 'pickup_longitude', 'dropoff_latitude', 'dropoff_longitude'];
          for (const c of cols) {
              const { error } = await dest.from('deliveries').select(c).limit(1);
              if (error) console.log(`   [WARNING] 'deliveries' missing '${c}'`);
              else console.log(`   [OK] 'deliveries' has '${c}'`);
          }
      }
    }
  }
}

check().catch(console.error);
