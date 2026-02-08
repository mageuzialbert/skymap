const { createClient } = require('@supabase/supabase-js');
console.log('Checking Source Business Columns...');
const SRC_URL = 'https://qtjhwpivngilqxownfoj.supabase.co';
const SRC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0amh3cGl2bmdpbHF4b3duZm9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE4MzAzMywiZXhwIjoyMDgzNzU5MDMzfQ.ybp-i-djaTB7K3hJ-9buIBkQ9mNMZaNjHcfIrmC9kgY';
const src = createClient(SRC_URL, SRC_KEY);

const TABLES = [
  'slider_images',
  'cms_content'
];

async function check() {
  console.log('--- Inspecting Missing Tables ---');
  
  for (const t of TABLES) {
      console.log(`\nTable: ${t}`);
      const { data, error } = await src.from(t).select('*').limit(1);
      if (error) {
          console.log(`Error: ${error.message}`);
      } else if (data.length === 0) {
          console.log(`No data found (Empty table). Cannot infer schema easily.`);
      } else {
          const row = data[0];
          console.log('Columns & Sample Values:');
          Object.keys(row).forEach(k => {
              const val = row[k];
              const type = typeof val;
              console.log(`  - ${k}: ${type} (${val})`);
          });
      }
  }
}
check();
