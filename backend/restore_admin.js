require('dotenv').config({path: './.env'});
const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://kttkzrbefqnoqvtmzrag.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixAdmin() {
  const email = 'pro171903@gmail.com';
  
  // Get user ID
  const { data: users, error: err1 } = await s.auth.admin.listUsers();
  if (err1) return console.error(err1);
  
  const adminUser = users.users.find(u => u.email === email);
  if (!adminUser) return console.log('Admin user not found');
  
  console.log('Found admin user:', adminUser.id);
  
  // Update role to admin
  const { data, error } = await s.from('profiles').update({ role: 'admin' }).eq('id', adminUser.id);
  if (error) console.error('Error updating role:', error);
  else console.log('Successfully restored admin role');

  // Also check if there's another email like login.done6565@gmail.com
  const adminUser2 = users.users.find(u => u.email === 'login.done6565@gmail.com');
  if (adminUser2) {
      await s.from('profiles').update({ role: 'admin' }).eq('id', adminUser2.id);
      console.log('Restored admin role for login.done6565@gmail.com');
  }
}
fixAdmin();
