const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://kttkzrbefqnoqvtmzrag.supabase.co",
  "sb_publishable_jrKcZlFCHQaDal9CQqtnhA_kua_e5mN"
);

async function checkTasks() {
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(5);
  if (error) {
    console.error('Error fetching tasks:', error);
  } else {
    console.log('Latest tasks:');
    data.forEach(task => {
      console.log(`- ID: ${task.id}, Title: ${task.title}, Status: ${task.status}, Seeker: ${task.seeker_id}, Lat: ${task.lat}, Lng: ${task.lng}`);
    });
  }
}

checkTasks();
