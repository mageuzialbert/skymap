const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SRC_URL = 'https://qtjhwpivngilqxownfoj.supabase.co';
const SRC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0amh3cGl2bmdpbHF4b3duZm9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE4MzAzMywiZXhwIjoyMDgzNzU5MDMzfQ.ybp-i-djaTB7K3hJ-9buIBkQ9mNMZaNjHcfIrmC9kgY';

const DEST_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DEST_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const src = createClient(SRC_URL, SRC_KEY);
const dest = createClient(DEST_URL, DEST_KEY);

const SOURCE_USER_ID = '4f5706d3-21a6-4978-b00e-9ef52038d087';

async function check() {
  console.log(`Checking Source User ID: ${SOURCE_USER_ID}`);
  
  // 1. Get Source Email
  const { data: { user: srcUser }, error: srcErr } = await src.auth.admin.getUserById(SOURCE_USER_ID);
  if (srcErr) { console.log('Source Error:', srcErr.message); return; }
  
  console.log(`Source Email: ${srcUser.email}`);

  // 2. Check Dest Auth
  const { data: { users: destUsers } } = await dest.auth.admin.listUsers(); 
  const destUser = destUsers.find(u => u.email === srcUser.email);
  
  if (!destUser) {
      console.log('❌ User NOT found in Destination Auth.');
      return;
  }
  console.log(`✅ User found in Dest Auth. ID: ${destUser.id}`);

  // 3. Check Dest Public
  const { data: publicUser, error: pErr } = await dest.from('users').select('*').eq('id', destUser.id).single();
  
  if (pErr) {
      console.log(`❌ User NOT found in Dest Public Users table: ${pErr.message}`);
      
      // Force Fix
      console.log('Attempting force sync...');
      const { error: insErr } = await dest.from('users').insert({
          id: destUser.id,
          email: destUser.email,
          phone: destUser.user_metadata?.phone || '',
          name: destUser.user_metadata?.business_name || destUser.email,
          role: destUser.user_metadata?.role || 'BUSINESS',
          active: true
      });
      if (insErr) console.log('Sync Failed:', insErr.message);
      else console.log('✅ Force Sync Successful!');
      
  } else {
      console.log(`✅ User found in Dest Public Users table. ID: ${publicUser.id}`);
  }
}

check().catch(console.error);
