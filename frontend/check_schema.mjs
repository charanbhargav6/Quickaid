import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kttkzrbefqnoqvtmzrag.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dGt6cmJlZnFub3F2dG16cmFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc5NTMyMywiZXhwIjoyMDk1MzcxMzIzfQ.fYiiICncU-cPfmaW0ctkTQsLAaGRLdUfzT2YpQ7buO4'
);

async function checkSchema() {
  const { data: tasks, error: taskErr } = await supabase.from('tasks').select('*').limit(1);
  const { data: tx, error: txErr } = await supabase.from('transactions').select('*').limit(1);

  console.log("TASKS COLUMNS:", tasks && tasks.length ? Object.keys(tasks[0]) : "No tasks found", taskErr);
  console.log("TRANSACTIONS COLUMNS:", tx && tx.length ? Object.keys(tx[0]) : "No transactions found", txErr);
}

checkSchema();
