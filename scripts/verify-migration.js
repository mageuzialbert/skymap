const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SRC_URL = 'https://qtjhwpivngilqxownfoj.supabase.co';
const SRC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0amh3cGl2bmdpbHF4b3duZm9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE4MzAzMywiZXhwIjoyMDgzNzU5MDMzfQ.ybp-i-djaTB7K3hJ-9buIBkQ9mNMZaNjHcfIrmC9kgY';

const DEST_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DEST_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const src = createClient(SRC_URL, SRC_KEY);
const dest = createClient(DEST_URL, DEST_KEY);

async function verify() {
  console.log('📊 Verifying Migration Counts Check...');
  console.log('------------------------------------------------');
  console.log('| Table          | Source | Dest   | Status      |');
  console.log('------------------------------------------------');

  const tables = [
    'users', 
    'businesses', 
    'deliveries', 
    'delivery_events',
    'expense_categories',
    'expenses',
    'company_profile',
    'payment_instructions',
    'delivery_fee_packages',
    'cms_content',
    'slider_images',
    'user_permissions'
  ];

  for (const t of tables) {
      const { count: srcCount, error: sErr } = await src.from(t).select('*', { count: 'exact', head: true });
      const { count: destCount, error: dErr } = await dest.from(t).select('*', { count: 'exact', head: true });
      
      if (sErr || dErr) {
          console.error(`Error checking ${t}:`, sErr || dErr);
          continue;
      }
      
      const status = srcCount === destCount ? '✅ Match' : ((destCount >= srcCount) ? '⚠️ Dest > Src' : '❌ Dest < Src');
      console.log(`| ${t.padEnd(14)} | ${String(srcCount).padEnd(6)} | ${String(destCount).padEnd(6)} | ${status.padEnd(11)} |`);
  }
  console.log('------------------------------------------------');
}

verify().catch(console.error);
