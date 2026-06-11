require('dotenv').config({path: './.env'});
const { createClient } = require('@supabase/supabase-js');

async function test() {
  const email = 'test_signup_metadata_999@example.com';
  const password = 'password123';
  
  const admin = createClient('https://kttkzrbefqnoqvtmzrag.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: 'Test Meta',
      phone: '+1234567890',
      role: 'helper'
    }
  });
  if (authError) {
    console.log('Auth Error:', authError);
    return;
  }
  const uid = authData.user.id;
  console.log('Created user:', uid);

  // Check what was saved to profile
  const { data: prof, error: profErr } = await admin.from('profiles').select('*').eq('id', uid).single();
  console.log('Profile data:', prof);

  // Clean up
  await admin.auth.admin.deleteUser(uid);
}
test();
