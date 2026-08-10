const { createClient } = require('@supabase/supabase-js');

// Load env vars
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials in backend/.env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runCoordinationTest() {
  console.log("=========================================");
  console.log("🚀 Running Web <-> App Coordination Test");
  console.log("=========================================\n");

  let taskReceived = false;
  const { data: profile } = await supabase.from('profiles').select('id').limit(1).single();
  const testSeekerId = profile ? profile.id : null;
  if (!testSeekerId) {
    console.error("No profiles exist in the DB to use as a seeker.");
    process.exit(1);
  }

  // 1. Subscribe to realtime updates on 'tasks'
  // This simulates the Flutter App listening for new tasks or updates
  console.log("📱 [App Client] Subscribing to Supabase Realtime 'tasks' channel...");
  
  const channel = supabase.channel('tasks_channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
      if (payload.new.title === "Coordination Test Task") {
        console.log("✅ [App Client] SUCCESS: Received real-time broadcast for new task!");
        taskReceived = true;
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log("📱 [App Client] Successfully connected to Realtime socket.");
      }
    });

  // Give the socket a second to fully connect
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 2. Simulate Web Client creating a task
  console.log("\n💻 [Web Client] Posting a new task to Supabase API...");
  
  const { data: taskData, error } = await supabase.from('tasks').insert({
    title: "Coordination Test Task",
    description: "Automated test to verify Web and App coordination.",
    pay: 50,
    category: "general",
    location_name: "Test Location",
    latitude: 12.0,
    longitude: 79.0,
    seeker_id: testSeekerId // We can bypass RLS constraints using Service Role Key
  }).select().single();

  if (error) {
    console.error("❌ [Web Client] ERROR posting task:", error.message);
    process.exit(1);
  }
  
  console.log(`💻 [Web Client] Task posted successfully! ID: ${taskData.id}`);

  // 3. Wait up to 5 seconds to receive the real-time event
  console.log("\n⏳ Waiting for Realtime coordination event...");
  for (let i = 0; i < 10; i++) {
    if (taskReceived) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 4. Cleanup test data
  console.log("\n🧹 Cleaning up test data...");
  await supabase.from('tasks').delete().eq('id', taskData.id);

  if (taskReceived) {
    console.log("🎉 TEST PASSED! Web and App are correctly coordinating in real-time.");
    process.exit(0);
  } else {
    console.error("❌ TEST FAILED! The App Client did not receive the real-time broadcast.");
    process.exit(1);
  }
}

runCoordinationTest();
