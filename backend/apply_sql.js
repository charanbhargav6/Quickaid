const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; // Service role key needed to bypass RLS and execute SQL or use admin API

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQLFile(filename) {
  try {
    const sqlPath = path.join(__dirname, filename);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Using an RPC 'exec_sql' if it exists. 
    // Wait, Supabase JS doesn't have an exec_sql by default unless we created one.
    // Let's try to see if we can do this.
    // If not, we will inform the user.
    console.log(`Please run ${filename} in your Supabase SQL Editor manually.`);
    
  } catch (e) {
    console.error("Error reading file", e);
  }
}

const args = process.argv.slice(2);
if (args.length > 0) {
  args.forEach(runSQLFile);
} else {
  runSQLFile('phase7_trust_safety.sql');
  runSQLFile('phase8_helper_availability.sql');
}
