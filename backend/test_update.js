require('dotenv').config({path: './.env'});
const { createClient } = require('@supabase/supabase-js');

async function test() {
  const email = 'test_signup_user_123@example.com';
  const password = 'password123';
  
  // Use anon client just like the frontend
  const s = createClient('https://kttkzrbefqnoqvtmzrag.supabase.co', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  const { data: authData, error: authError } = await s.auth.signUp({
    email,
    password,
  });
  if (authError) {
    console.log('Auth Error:', authError);
    return;
  }
  const uid = authData.user.id;
  console.log('Created user:', uid);

  // Attempt to UPDATE
  const { data: prof, error: profErr } = await s.from('profiles').update({ role: 'helper' }).eq('id', uid);
  console.log('Update Error:', profErr);

  // Clean up using service role
  const admin = createClient('https://kttkzrbefqnoqvtmzrag.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);
  await admin.auth.admin.deleteUser(uid);
}
test();
