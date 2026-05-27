require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function run() {
  console.log("Adding image_url column...");
  // Use raw sql if possible, but JS client doesn't have a direct raw SQL execute unless via RPC or just altering via Postgres
  // Wait, RPC execute_sql might not exist. I'll just create the bucket first.
  const { data, error } = await supabase.storage.createBucket('task_images', { public: true });
  console.log('Bucket creation result:', data, error);
}

run();
