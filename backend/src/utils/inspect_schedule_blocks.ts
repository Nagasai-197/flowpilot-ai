import { supabase } from "../lib/supabase.js";

async function run() {
  console.log("Inspecting 'schedule_blocks' table...");
  try {
    const { data, error } = await supabase.from("schedule_blocks").select("*").limit(1);
    if (error) {
      console.log("❌ Error:", error.message);
    } else {
      console.log("✅ schedule_blocks structure:", data);
    }
  } catch (err: any) {
    console.error("❌ Exception:", err.message);
  }
}

run();
