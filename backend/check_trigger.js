require('dotenv').config({path: './.env'});
const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://kttkzrbefqnoqvtmzrag.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await s.rpc('exec_sql', { query: "SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';" });
  if (error) {
     console.log("No exec_sql, trying to create an RPC function first...");
     // I can't create an RPC from REST. I have to use fix.js approach or just assume what it is.
  }
}
check();
