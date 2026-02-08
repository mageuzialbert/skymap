const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const DEST_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DEST_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(DEST_URL, DEST_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function sync() {
  console.log('🔄 Syncing Auth Users to Public Users (v2)...');
  
  // 1. Get all Auth Users
  const { data: { users: authUsers }, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (authErr) { console.error('Error fetching auth users:', authErr); return; }
  console.log(`Auth Users: ${authUsers.length}`);

  // 2. Get all Public Users
  const { data: publicUsers, error: pubErr } = await supabase.from('users').select('id');
  if (pubErr) { console.error('Error fetching public users:', pubErr); return; }
  console.log(`Public Users: ${publicUsers.length}`);

  const publicUserIds = new Set(publicUsers.map(u => u.id));
  const missingUsers = authUsers.filter(u => !publicUserIds.has(u.id));

  console.log(`Missing Users: ${missingUsers.length}`);

  for (const user of missingUsers) {
      console.log(`   Syncing user ${user.email} (${user.id})...`);
      
      let phone = user.user_metadata?.phone || user.phone || '';
      
      // Try insert
      let { error } = await supabase.from('users').insert({
          id: user.id,
          email: user.email,
          phone: phone,
          name: user.user_metadata?.business_name || user.user_metadata?.name || user.email.split('@')[0],
          role: user.user_metadata?.role || 'BUSINESS',
          active: true
      });
      
      if (error && error.code === '23505') { // Unique violation (likely phone)
          console.log(`      ⚠️ Unique violation for ${user.email}. Retrying with dummy phone...`);
          phone = `duplicate-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          
          const { error: retryErr } = await supabase.from('users').insert({
              id: user.id,
              email: user.email,
              phone: phone,
              name: user.user_metadata?.business_name || user.user_metadata?.name || user.email.split('@')[0],
              role: user.user_metadata?.role || 'BUSINESS',
              active: true
          });
          
          if (retryErr) {
             console.error(`      ❌ Failed retry: ${retryErr.message}`);
          } else {
             console.log(`      ✅ Synced with dummy phone.`);
          }
      } else if (error) {
          console.error(`   ❌ Failed to sync user: ${error.message}`);
      } else {
          console.log(`   ✅ Synced.`);
      }
  }
}

sync().catch(console.error);
