import { supabase } from "../lib/supabase.js";

async function run() {
  console.log("Testing connection to 'goals' table...");
  try {
    const { data, error } = await supabase.from("goals").select("*").limit(5);
    if (error) {
      console.error("❌ Error querying goals table:", error);
    } else {
      console.log("✅ Successfully connected! Goals data:", data);
    }
  } catch (err) {
    console.error("❌ Exception during db test:", err);
  }
}

run();
