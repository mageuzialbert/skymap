const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const DEST_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DEST_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const dest = createClient(DEST_URL, DEST_KEY);

const EMAIL = 'superadmin@skymap.com';

async function check() {
  console.log(`Checking Admin User: ${EMAIL}...`);

  // 1. Check Auth User
  const { data: { users }, error: authErr } = await dest.auth.admin.listUsers();
  const user = users?.find(u => u.email === EMAIL);
  
  if (!user) {
      console.log('❌ Auth User NOT FOUND.');
      return;
  }
  
  console.log('✅ Auth User found.');
  console.log('   ID:', user.id);
  console.log('   Metadata:', user.user_metadata);
  console.log('   App Metadata:', user.app_metadata);
  
  // 2. Check Public User
  const { data: publicUser, error: pubErr } = await dest.from('users').select('*').eq('id', user.id).single();
  
  if (pubErr) {
      console.log('❌ Public User Error:', pubErr.message);
  } else if (!publicUser) {
      console.log('❌ Public User NOT FOUND.');
  } else {
      console.log('✅ Public User found.');
      console.log('   Role:', publicUser.role);
      console.log('   Active:', publicUser.active);
  }
}

check().catch(console.error);
