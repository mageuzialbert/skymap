const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SRC_URL = 'https://qtjhwpivngilqxownfoj.supabase.co';
const SRC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0amh3cGl2bmdpbHF4b3duZm9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE4MzAzMywiZXhwIjoyMDgzNzU5MDMzfQ.ybp-i-djaTB7K3hJ-9buIBkQ9mNMZaNjHcfIrmC9kgY';

const DEST_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DEST_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const src = createClient(SRC_URL, SRC_KEY);
const dest = createClient(DEST_URL, DEST_KEY);

async function debug() {
  console.log('🔍 Debugging Business Owner...');

  // 1. Find the business in Source
  const { data: businesses, error: busErr } = await src.from('businesses')
    .select('*, users!inner(email)') // Try to join if possible, otherwise just select ID
    .ilike('name', '%The sky map%') 
    .limit(1);

  if (busErr || !businesses.length) {
      console.log('Business not found in source or error:', busErr);
      // Fallback: list all businesses to see names
      const { data: all } = await src.from('businesses').select('name').limit(5);
      console.log('Sample businesses:', all.map(b => b.name));
      return;
  }
  
  const business = businesses[0];
  console.log(`Found Business: "${business.name}"`);
  console.log(`Source Owner ID: ${business.user_id}`);
  
  // Get owner email from Source
  console.log('Fetching source user...');
  const { data: { user: srcUser }, error: uErr } = await src.auth.admin.getUserById(business.user_id);
  
  if (uErr) { 
      console.log('Source User not found in Auth or Error:', uErr.message); 
      return;
  }
  
  if (!srcUser) {
      console.log('Source User is NULL (deleted?)');
      return;
  }
  
  console.log(`Source Owner Email: ${srcUser.email}`);

  // 2. Check Owner in Dest Auth
  const { data: { users: destUsers } } = await dest.auth.admin.listUsers({ perPage: 1000 });
  const destUser = destUsers.find(u => u.email === srcUser.email);
  
  if (!destUser) {
      console.log('❌ User NOT found in Destination Auth.');
      return;
  }
  console.log(`✅ User found in Dest Auth. ID: ${destUser.id}`);

  // 3. Check Owner in Dest Public
  const { data: publicUser, error: pErr } = await dest.from('users').select('*').eq('id', destUser.id).single();
  if (pErr) {
      console.log(`❌ User NOT found in Dest Public Users table: ${pErr.message}`);
      // Attempt to sync if missing?
      // const syncRes = await dest.from('users').insert({ id: destUser.id, email: destUser.email, ... });
      // console.log('Attempted sync:', syncRes);
  } else {
      console.log(`✅ User found in Dest Public Users table. ID: ${publicUser.id}`);
  }
}

debug().catch(console.error);
