require('dotenv').config({path: './.env'});
const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://kttkzrbefqnoqvtmzrag.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const email = 'test_signup_123@example.com';
  const { data: authData, error: authError } = await s.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true
  });
  if (authError) {
    console.log('Auth Error:', authError);
    return;
  }
  const uid = authData.user.id;
  console.log('Created user:', uid);

  // Check if profile exists already (trigger)
  const { data: prof, error: profErr } = await s.from('profiles').select('*').eq('id', uid).single();
  console.log('Profile exists?:', prof ? 'Yes' : 'No', profErr ? profErr.message : '');

  // Cleanup
  await s.auth.admin.deleteUser(uid);
}
test();
