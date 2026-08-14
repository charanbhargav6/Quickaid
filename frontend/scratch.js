const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://kttkzrbefqnoqvtmzrag.supabase.co",
  "sb_publishable_jrKcZlFCHQaDal9CQqtnhA_kua_e5mN"
);

// We need the service role key to query postgres internals if possible, but actually we can just use the Postgres function through a direct SQL query if we had pg.
// Alternatively, let's just inspect the frontend logic, maybe there's a simpler reason!
