const { createClient } = require('@supabase/supabase-js');

// Can't run DDL via supabase-js without postgres connection string.
// However, Supabase JS has `.rpc()`!
// If we create an RPC to run arbitrary SQL, or just use `pg` with connection string if available.
// Wait, is there a way to connect via `pg` using Supabase API? No.
