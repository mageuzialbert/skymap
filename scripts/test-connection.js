const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SRC_URL = 'https://qtjhwpivngilqxownfoj.supabase.co';
const SRC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0amh3cGl2bmdpbHF4b3duZm9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE4MzAzMywiZXhwIjoyMDgzNzU5MDMzfQ.ybp-i-djaTB7K3hJ-9buIBkQ9mNMZaNjHcfIrmC9kgY';

const src = createClient(SRC_URL, SRC_KEY);

async function test() {
  console.log('Testing Source Connection...');
  const { data, error } = await src.from('businesses').select('id, name').limit(3);
  if (error) {
      console.log('Error:', error.message);
  } else {
      console.log('Success! Found businesses:', data.length);
      data.forEach(b => console.log(` - ${b.name}`));
  }
}

test().catch(console.error);
