const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SRC_URL = 'https://qtjhwpivngilqxownfoj.supabase.co';
const SRC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0amh3cGl2bmdpbHF4b3duZm9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE4MzAzMywiZXhwIjoyMDgzNzU5MDMzfQ.ybp-i-djaTB7K3hJ-9buIBkQ9mNMZaNjHcfIrmC9kgY';

const DEST_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DEST_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const src = createClient(SRC_URL, SRC_KEY);
const dest = createClient(DEST_URL, DEST_KEY);

const CANDIDATE_TABLES = [
  // From schema.sql
  'users', 
  'businesses', 
  'deliveries', 
  'delivery_events',
  'regions', 
  'districts',
  'charges',
  'invoices',
  'invoice_items',
  'sms_logs',
  'otp_codes',
  
  // Potential extra tables referenced or common
  'expenses',
  'expense_categories',
  'company_profile',
  'payment_instructions',
  'delivery_fee_packages',
  
  // Guesses
  'package_types',
  'riders',
  'customers',
  'reviews',
  'orders',
  'products',
  'inventory',
  'payments',
  'notifications',
  'audit_logs',
  'roles',
  'permissions',
  'app_check',
  'app_versions',
  'logs',
  'app_settings',
  'api_keys'
];

async function check() {
  console.log('🔍 Probing for Tables...');
  
  const results = [];

  for (const t of CANDIDATE_TABLES) {
      // Check Source
      let inSrc = false;
      const { error: sErr } = await src.from(t).select('count', { count: 'exact', head: true }).limit(1);
      if (!sErr || sErr.code !== '42P01') inSrc = true; // 42P01 is undefined_table

      // Check Dest
      let inDest = false;
      const { error: dErr } = await dest.from(t).select('count', { count: 'exact', head: true }).limit(1);
      if (!dErr || dErr.code !== '42P01') inDest = true;

      if (inSrc || inDest) {
         results.push({ table: t, inSrc, inDest });
      }
  }
  
  console.table(results);
  
  console.log('\n--- Missing Tables (In Source but NOT in Dest) ---');
  results.filter(r => r.inSrc && !r.inDest).forEach(r => console.log(` - ${r.table}`));
}

check().catch(console.error);
