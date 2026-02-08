const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const DEST_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DEST_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const dest = createClient(DEST_URL, DEST_KEY);

async function findAdmin() {
  console.log('🔍 Searching for ADMIN users in Destination...');
  
  const { data: admins, error } = await dest
      .from('users')
      .select('*')
      .eq('role', 'ADMIN');
      
  if (error) {
      console.error('Error:', error.message);
      return;
  }
  
  if (admins.length === 0) {
      console.log('❌ No ADMIN users found.');
      // Check if we should check role in metadata?
      // Sometimes role is in raw_app_meta_data
      console.log('Checking Auth Metadata...');
      const { data: { users }, error: authErr } = await dest.auth.admin.listUsers();
      if (users) {
          const authAdmins = users.filter(u => u.user_metadata?.role === 'ADMIN' || u.app_metadata?.role === 'ADMIN');
          if (authAdmins.length > 0) {
              console.log('Found Admins in Auth Metadata:');
              authAdmins.forEach(u => console.log(` - ${u.email} (ID: ${u.id})`));
          } else {
              console.log('❌ No ADMINs found in Auth Metadata either.');
          }
      }
  } else {
      console.log(`✅ Found ${admins.length} Admin(s):`);
      admins.forEach(a => {
          console.log(` - Email: ${a.email}`);
          console.log(`   ID:    ${a.id}`);
          console.log(`   Phone: ${a.phone}`);
      });
  }
}

findAdmin().catch(console.error);
