const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  console.log('Creating admin user...');
  
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'pro171903@gmail.com',
    password: 'admin@2005q',
    email_confirm: true,
    user_metadata: { full_name: 'Main Admin' }
  });

  if (authError) {
    console.error('Error creating auth user:', authError.message);
    return;
  }
  
  console.log('Auth user created successfully with ID:', authData.user.id);
  await new Promise(r => setTimeout(r, 1000));
  
  console.log('Updating profile role to admin...');
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'admin', is_suspended: false })
    .eq('id', authData.user.id);
    
  if (profileError) {
    console.error('Error updating profile:', profileError.message);
  } else {
    console.log('Admin profile setup successfully!');
  }
}

createAdmin();
