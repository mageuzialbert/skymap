const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// --- CONFIGURATION ---
const SRC_URL = 'https://qtjhwpivngilqxownfoj.supabase.co';
const SRC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0amh3cGl2bmdpbHF4b3duZm9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE4MzAzMywiZXhwIjoyMDgzNzU5MDMzfQ.ybp-i-djaTB7K3hJ-9buIBkQ9mNMZaNjHcfIrmC9kgY';

const DEST_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DEST_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DEST_URL || !DEST_KEY) {
  console.error('❌ Missing Destination credentials in .env.local');
  process.exit(1);
}

const src = createClient(SRC_URL, SRC_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const dest = createClient(DEST_URL, DEST_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Map to store ID mappings: OldUUID -> NewUUID
const userIdMap = new Map();
const businessIdMap = new Map();
const deliveryIdMap = new Map();

async function migrate() {
  console.log('🚀 Starting Data Migration...');
  console.log(`Source: ${SRC_URL}`);
  console.log(`Dest:   ${DEST_URL}\n`);

  try {
    // 1. Migrate Users (Auth)
    await migrateUsers();

    // 2. Migrate Geographic Data (Regions & Districts) if needed
    // For now, we assume standard data is identical or we rely on names
    // But schema says they have IDs. Let's check if they are standard.
    // If they are static data, we might not need to migrate them if `tanzania-locations.sql` runs.
    // However, if relations use IDs, we need to ensure IDs match or we verify names.
    // Given the complexity, let's assume `tanzania-locations.sql` populated them with same IDs or we just rely on the new IDs found by name.
    
    // 3. Migrate Businesses
    await migrateBusinesses();

    // 4. Migrate Deliveries
    await migrateDeliveries();

    // 5. Migrate Delivery Events
    await migrateDeliveryEvents();
    
    // 6. Migrate SMS Logs / OTPs (Optional/Low Priority - skipping for now to focus on core data)

    console.log('\n✅ Migration Complete!');
    
  } catch (error) {
    console.error('\n❌ Migration Failed:', error);
  }
}

async function migrateUsers() {
  console.log('🔄 Migrating Users...');
  
  // Fetch all source users
  const { data: { users: srcUsers }, error: srcErr } = await src.auth.admin.listUsers();
  if (srcErr) throw new Error(`Failed to list source users: ${srcErr.message}`);

  console.log(`Found ${srcUsers.length} users in Source.`);

  for (const user of srcUsers) {
    // Check if user exists in Dest by email
    // Note: listUsers in Dest might be paginated, for safety let's just try to create and catch error, 
    // or better, try to find by email first if possible. 
    // Supabase Admin API doesn't have "getUserByEmail". 
    // We'll trust "createUser" to fail if exists, but we need the ID.
    // Actually, we can just list all dest users first to build a lookup.

    // Efficient way: List all dest users first
    if (!global.destUsersMap) {
       const { data: { users: destUsers }, error: destErr } = await dest.auth.admin.listUsers({ perPage: 1000 });
       if (destErr) throw new Error(`Failed to list dest users: ${destErr.message}`);
       global.destUsersMap = new Map(destUsers.map(u => [u.email, u]));
    }

    let destUser = global.destUsersMap.get(user.email);
    let newUserId;

    if (destUser) {
      console.log(`   User ${user.email} exists in Dest. Mapping ID.`);
      newUserId = destUser.id;
    } else {
      console.log(`   Creating user ${user.email}...`);
      const { data: { user: newUser }, error: createErr } = await dest.auth.admin.createUser({
        email: user.email,
        password: 'TemporaryPassword123!', // We can't migrate passwords. User must reset.
        email_confirm: true,
        user_metadata: user.user_metadata
      });

      if (createErr) {
        console.error(`   ⚠️ Failed to create user ${user.email}: ${createErr.message}`);
        continue;
      }
      newUserId = newUser.id;
      // Add to our cache
      global.destUsersMap.set(user.email, newUser);
    }

    userIdMap.set(user.id, newUserId);
    
    // Also update public.users table? 
    // The trigger `handle_new_user` should have created the record in public.users automatically
    // when we used admin.createUser. 
    // We just need to ensure the data is consistent.
    
    // Let's copy specific public profile fields that might not be in metadata
    const { data: srcProfile } = await src.from('users').select('*').eq('id', user.id).single();
    if (srcProfile) {
        await dest.from('users').update({
            name: srcProfile.name,
            phone: srcProfile.phone,
            role: srcProfile.role,
            active: srcProfile.active
        }).eq('id', newUserId);
    }
  }
  console.log(`Mapped ${userIdMap.size} users.`);
}

async function migrateBusinesses() {
  console.log('\n🔄 Migrating Businesses...');
  const { data: businesses, error } = await src.from('businesses').select('*');
  if (error) throw error;

  for (const item of businesses) {
    // Remap user_id
    const newOwnerId = userIdMap.get(item.user_id);
    if (!newOwnerId) {
       console.warn(`   ⚠️ Skipping business ${item.name} (Owner ${item.user_id} not found locally under new ID)`);
       continue;
    }

    // Remap district_id 
    // We assume district IDs are integers (1, 2, 3...). 
    // If standard seed data, they match. If dynamic, we might have issues.
    // Let's assume they match for now as they come from `tanzania-locations.sql`
    
    const newItem = { ...item };
    delete newItem.id; // Let Postgres generate new ID
    newItem.user_id = newOwnerId;
    
    // Check if business already exists (by name/owner)?
    // Or just insert. To be safe, let's try to upsert or check existence.
    // 'phone' is unique in schema.
    const { data: existing } = await dest.from('businesses').select('id').eq('phone', item.phone).single();
    
    let result;
    if (existing) {
        console.log(`   Updating business ${item.name}...`);
         const { data, error: upErr } = await dest.from('businesses')
            .update(newItem)
            .eq('id', existing.id)
            .select()
            .single();
         if (upErr) { console.error(`Failed to update business: ${upErr.message}`); continue; }
         result = data;
    } else {
        console.log(`   Creating business ${item.name}...`);
        const { data, error: inErr } = await dest.from('businesses')
            .insert(newItem)
            .select()
            .single();
         if (inErr) { console.error(`Failed to insert business: ${inErr.message}`); continue; }
         result = data;
    }
    
    if (result) {
        businessIdMap.set(item.id, result.id);
    }
  }
}

async function migrateDeliveries() {
  console.log('\n🔄 Migrating Deliveries...');
  // We might want to migrate only active or recent deliveries? 
  // For now, let's migrate all.
  
  const { data: deliveries, error } = await src.from('deliveries').select('*');
  if (error) throw error;

  console.log(`Found ${deliveries.length} deliveries.`);

  for (const item of deliveries) {
      const newItem = { ...item };
      delete newItem.id; // Generate new ID
      
      // Map Foreign Keys
      // Business
      const newBusinessId = businessIdMap.get(item.business_id);
      if (!newBusinessId) {
          console.log(`   ⚠️ Skipping delivery ${item.id}: Business ${item.business_id} not mapped.`); 
          continue; 
      }
      newItem.business_id = newBusinessId;
      
      // Rider
      if (item.assigned_rider_id) {
          const newRiderId = userIdMap.get(item.assigned_rider_id);
          newItem.assigned_rider_id = newRiderId || null; // Explicit null if not foun
          if (!newRiderId && item.assigned_rider_id) {
             // console.log(`   ℹ️ Rider ${item.assigned_rider_id} not found. Setting to NULL.`);
          }
      }
      
      // Created By
      if (item.created_by) {
          const newCreatorId = userIdMap.get(item.created_by);
          newItem.created_by = newCreatorId || null; // Explicit null if not found
           if (!newCreatorId && item.created_by) {
             // console.log(`   ℹ️ Creator ${item.created_by} not found. Setting to NULL.`);
          }
      }
      
      // Insert
      const { data, error: inErr } = await dest.from('deliveries')
          .insert(newItem)
          .select()
          .single();
          
      if (inErr) {
          console.error(`   Failed delivery ${item.id} (Creator: ${item.created_by} -> ${newItem.created_by}): ${inErr.message}`);
      } else {
          deliveryIdMap.set(item.id, data.id);
      }
  }
}

async function migrateDeliveryEvents() {
    console.log('\n🔄 Migrating Delivery Events...');
    const { data: events, error } = await src.from('delivery_events').select('*');
    if (error) throw error;

    for (const item of events) {
        const newItem = { ...item };
        delete newItem.id;
        
        newItem.delivery_id = deliveryIdMap.get(item.delivery_id);
        if (!newItem.delivery_id) continue;
        
        if (newItem.created_by) {
            newItem.created_by = userIdMap.get(item.created_by);
        }

        await dest.from('delivery_events').insert(newItem);
    }
}

migrate().catch(console.error);
