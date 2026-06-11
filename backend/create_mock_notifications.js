const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY in backend/.env file.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createMockNotifications() {
  console.log("Checking for active user profiles to attach mock notifications...");
  
  // Get the first active profile
  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('id, full_name')
    .limit(1);

  if (profileErr) {
    console.error("Error fetching profiles:", profileErr);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log("[ERROR] No user profiles found in the database. Please register/log in via the app first!");
    return;
  }

  const targetUser = profiles[0];
  console.log(`\nFound target user: ${targetUser.full_name} (ID: ${targetUser.id})`);

  const mockNotifs = [
    {
      user_id: targetUser.id,
      title: "Welcome to QuickAid! ⚡",
      body: "Complete your verification profile to start accepting tasks and earning today.",
      is_read: true,
      data: { route: "/settings", screen: "Verification" },
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
    },
    {
      user_id: targetUser.id,
      title: "New Task Available! 🛋️",
      body: "Need help moving a refrigerator in your campus area. Pays ₹450.",
      is_read: false,
      data: { route: "/my_tasks", taskId: "ref-992" },
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
    },
    {
      user_id: targetUser.id,
      title: "Wallet Payment Received 💰",
      body: "Congratulations! Seeker has approved your work and credited ₹600 to your wallet.",
      is_read: false,
      data: { route: "/earnings" },
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15 mins ago
    }
  ];

  console.log("\nInserting mock notifications...");

  const { data, error } = await supabase
    .from('notifications')
    .insert(mockNotifs)
    .select();

  if (error) {
    console.error("[ERROR] Error inserting mock notifications:");
    console.error(error.message);
    console.log("\nIMPORTANT: If this fails, make sure you ran the SQL script in your Supabase SQL editor to create the table and columns!");
  } else {
    console.log(`\n[OK] Success! Inserted ${data.length} mock notifications for ${targetUser.full_name}!`);
    console.log("You can now open the app or refresh the notifications page to view them.");
  }
}

createMockNotifications();
