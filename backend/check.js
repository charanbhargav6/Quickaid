require('dotenv').config({path: './.env'});
const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://kttkzrbefqnoqvtmzrag.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await s.rpc('exec_sql', { query: "SELECT policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'profiles';" });
  if (error) console.log(error);
  console.log(data);
}
check();
