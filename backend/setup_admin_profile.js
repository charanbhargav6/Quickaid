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

async function setupAdmin() {
  console.log('Fetching users...');
  
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }
  
  const adminUser = users.find(u => u.email === 'pro171903@gmail.com');
  
  if (!adminUser) {
    console.error('Admin user not found in Auth.');
    return;
  }
  
  console.log('Found admin user with ID:', adminUser.id);
  
  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert({
      id: adminUser.id,
      email: adminUser.email,
      full_name: 'Main Admin',
      phone: null,
      role: 'admin',
      trust_score: 100,
      wallet_balance: 0,
      tasks_completed: 0,
      total_earnings: 0,
      is_suspended: false
    });
    
  if (upsertError) {
    console.error('Error upserting profile:', upsertError.message);
  } else {
    console.log('Admin profile successfully configured!');
  }
}

setupAdmin();
