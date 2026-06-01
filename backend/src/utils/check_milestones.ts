import { supabase } from '../lib/supabase.js';

async function run() {
  console.log("Checking if table 'goal_milestones' exists...");
  try {
    const { data, error } = await supabase.from('goal_milestones').select('*').limit(1);
    if (error) {
      console.log("❌ Table check result error:", error.message, error.code);
    } else {
      console.log("✅ Table exists! Sample data:", data);
    }
  } catch (err: any) {
    console.error("❌ Exception:", err.message);
  }
}

run();
