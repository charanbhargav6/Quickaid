const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://kttkzrbefqnoqvtmzrag.supabase.co",
  "sb_publishable_jrKcZlFCHQaDal9CQqtnhA_kua_e5mN"
);

async function checkRPC() {
  console.log("Calling get_nearby_tasks...");
  const { data, error } = await supabase.rpc('get_nearby_tasks', {
    p_lat: 13.028066845127388,
    p_lng: 80.0156828972057,
    p_radius_km: 10,
    p_helper_id: "cdeb74bd-be1f-4a18-b0a1-e7e541bce536",
    p_search_query: null,
    p_category: null,
    p_min_pay: null
  });

  if (error) {
    console.error("RPC Error:", error.message, error.details, error.hint);
  } else {
    console.log("RPC Success. Tasks found:", data ? data.length : 0);
    if (data) console.log(JSON.stringify(data, null, 2));
  }
}

checkRPC();
