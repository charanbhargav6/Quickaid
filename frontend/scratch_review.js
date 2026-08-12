import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkReviews() {
  const { data, error } = await supabase.from('reviews').select('*').limit(1);
  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Review Columns:");
    if (data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      console.log("No data found, can't infer schema.");
    }
  }
}

checkReviews();
