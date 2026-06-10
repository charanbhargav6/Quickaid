const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://kttkzrbefqnoqvtmzrag.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: users } = await supabase.from('profiles').select('id').limit(1);
  if (!users || users.length === 0) return console.log('No users');
  const userId = users[0].id;
  
  // Try inserting with body and data
  const { error } = await supabase.from('notifications').insert({ user_id: userId, title: 'Test', body: 'Test body', type: 'alert', data: { test: true } });
  console.log('Insert body/data error:', error);

  // Clean up
  await supabase.from('notifications').delete().eq('title', 'Test');
}
check();
