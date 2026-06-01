import { supabase } from '../lib/supabase.js';

async function run() {
  console.log("Inspecting 'tasks' table...");
  try {
    const { data, error } = await supabase.from('tasks').select('*').limit(1);
    if (error) {
      console.log("❌ Error:", error.message);
    } else {
      console.log("✅ Tasks structure:", data);
    }
  } catch (err: any) {
    console.error("❌ Exception:", err.message);
  }
}

run();
