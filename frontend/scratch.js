import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, status, seeker_id, helper_id')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) console.error("Error:", error);
  console.log(JSON.stringify(data, null, 2));
}

checkTasks();
