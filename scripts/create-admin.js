const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const DEST_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DEST_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const dest = createClient(DEST_URL, DEST_KEY);

const EMAIL = 'superadmin@skymap.com';
const PASSWORD = 'SkyMapAdmin2026!';

async function createAdmin() {
  console.log(`Creating Admin User: ${EMAIL}...`);

  // 1. Create in Auth
  const { data: { user }, error: createErr } = await dest.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'ADMIN', name: 'Super Admin' }
  });

  if (createErr) {
      console.error('Error creating auth user:', createErr.message);
      // If already exists, maybe just update password?
      if (createErr.message.includes('already registered')) {
          console.log('User exists. Attempting to update password...');
          const { data: { user: existingUser }, error: findErr } = await dest.auth.admin.listUsers();
          const target = existingUser?.find(u => u.email === EMAIL); // simplified
          
          if (target) {
             const { error: updateErr } = await dest.auth.admin.updateUserById(target.id, { password: PASSWORD });
             if (updateErr) console.error('Failed to update password:', updateErr);
             else {
                 console.log('✅ Password updated.');
                 // Ensure public role
                 await ensurePublicAdmin(target.id);
             }
          }
      }
      return;
  }

  console.log(`✅ Auth User Created. ID: ${user.id}`);
  await ensurePublicAdmin(user.id);
}

async function ensurePublicAdmin(userId) {
    // 2. Update Public Table
    // The trigger might have created it, but let's force the role to ADMIN
    console.log('Ensuring public.users role is ADMIN...');
    
    // Check if exists first
    const { data: existing } = await dest.from('users').select('id').eq('id', userId).maybeSingle();
    
    if (!existing) {
        // Insert if missing (trigger failed?)
        const { error: inErr } = await dest.from('users').insert({
            id: userId,
            email: EMAIL,
            name: 'Super Admin',
            role: 'ADMIN',
            phone: '+00000000000' // Dummy phone
        });
        if (inErr) console.error('Error inserting public user:', inErr);
        else console.log('✅ Public user inserted.');
    } else {
        // Update
        const { error: upErr } = await dest.from('users').update({
            role: 'ADMIN'
        }).eq('id', userId);
        
        if (upErr) console.error('Error updating public user:', upErr);
        else console.log('✅ Public user role updated to ADMIN.');
    }
}

createAdmin().catch(console.error);
