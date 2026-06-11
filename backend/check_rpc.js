require('dotenv').config({path: './.env'});
const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://kttkzrbefqnoqvtmzrag.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await s.rpc('get_rpc_list'); // if this doesn't exist, we can't query pg_proc easily from JS without rpc
  console.log(error);
}
check();
