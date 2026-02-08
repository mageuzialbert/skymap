const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SRC_URL = 'https://qtjhwpivngilqxownfoj.supabase.co';
const SRC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0amh3cGl2bmdpbHF4b3duZm9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE4MzAzMywiZXhwIjoyMDgzNzU5MDMzfQ.ybp-i-djaTB7K3hJ-9buIBkQ9mNMZaNjHcfIrmC9kgY';

const DEST_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DEST_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const src = createClient(SRC_URL, SRC_KEY);
const dest = createClient(DEST_URL, DEST_KEY);

const userIdMap = new Map(); // srcId -> destId

async function buildUserMap() {
  console.log('🗺️  Building User Map...');
  // 1. Fetch Source Users (from auth or public?)
  // We need Source IDs. Accessible via public.users if synced, or we just rely on email matching.
  // Let's assume public.users in source has the OLD IDs.
  const { data: srcUsers, error: sErr } = await src.from('users').select('id, email, phone');
  if (sErr) { console.error('Error fetching src users:', sErr); return; }

  // 2. Fetch Dest Users (Auth)
  const { data: { users: destUsers }, error: dErr } = await dest.auth.admin.listUsers({ perPage: 1000 });
  if (dErr) { console.error('Error fetching dest users:', dErr); return; }

  // 3. Map
  for (const sUser of srcUsers) {
      // Find by email plain
      let dUser = destUsers.find(u => u.email?.toLowerCase() === sUser.email?.toLowerCase());
      
      // If not found, try phone?
      if (!dUser && sUser.phone) {
          // Phones might vary in format, but let's try exact match first
          dUser = destUsers.find(u => u.phone === sUser.phone);
      }

      if (dUser) {
          userIdMap.set(sUser.id, dUser.id);
      }
  }
  console.log(`   Mapped ${userIdMap.size} users.`);
}

async function migrateTable(tableName, idRemapFn = null) {
  console.log(`\n🔄 Migrating ${tableName}...`);
  
  const { data: srcRows, error } = await src.from(tableName).select('*');
  if (error) {
      console.error(`   ❌ Error fetching source ${tableName}:`, error.message);
      return;
  }
  
  if (srcRows.length === 0) {
      console.log(`   ℹ️  Source table is empty. Skipping.`);
      return;
  }

  console.log(`   Found ${srcRows.length} rows.`);
  
  let successCount = 0;
  let skipCount = 0;

  for (const row of srcRows) {
      // Apply remapping if needed
      if (idRemapFn) {
          const shouldSkip = idRemapFn(row);
          if (shouldSkip) {
              skipCount++;
              continue;
          }
      }

      // Check if exists
      const { data: existing } = await dest.from(tableName).select('id').eq('id', row.id).maybeSingle();
      
      if (existing) {
          // Update? Or Skip? Let's Upsert to be safe.
          const { error: upErr } = await dest.from(tableName).upsert(row);
          if (upErr) console.error(`   ❌ Failed to update ${row.id}:`, upErr.message);
          else successCount++;
      } else {
          // Insert
          const { error: inErr } = await dest.from(tableName).insert(row);
          if (inErr) console.error(`   ❌ Failed to insert ${row.id}:`, inErr.message);
          else successCount++;
      }
  }
  console.log(`   ✅ Processed: ${successCount} success, ${skipCount} skipped.`);
}

async function run() {
  await buildUserMap();

  // 1. Independent Tables
  await migrateTable('expense_categories');
  await migrateTable('company_profile');
  await migrateTable('payment_instructions');
  await migrateTable('delivery_fee_packages');
  await migrateTable('cms_content');
  await migrateTable('slider_images');

  // 2. Dependent Tables
  
  // Expenses (depends on categories and users)
  await migrateTable('expenses', (row) => {
      // Remap created_by
      if (row.created_by) {
          const newId = userIdMap.get(row.created_by);
          if (!newId) {
             // console.warn(`   ⚠️ User ${row.created_by} not found in map. Setting to NULL.`);
             row.created_by = null; 
          } else {
             row.created_by = newId;
          }
      }
      return false; // Don't skip row
  });

  // User Permissions (depends on users)
  await migrateTable('user_permissions', (row) => {
      if (row.user_id) {
          const newId = userIdMap.get(row.user_id);
          if (!newId) {
             console.warn(`   ⚠️ User ${row.user_id} not found. Skipping permission.`);
             return true; // Skip this row
          }
          row.user_id = newId;
      }
      return false;
  });
  
  console.log('\n✅ All missing tables migrated.');
}

run().catch(console.error);
