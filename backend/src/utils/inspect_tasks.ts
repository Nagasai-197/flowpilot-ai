import { supabase } from "../lib/supabase.js";

async function run() {
  console.log("Listing all columns in 'tasks' table...");
  try {
    const { data, error } = await supabase.rpc("get_table_columns", { table_name: "tasks" });
    if (error) {
      // Fallback: use a direct query or generic query
      console.log("RPC get_table_columns failed, attempting fallback query");
      const { data: cols, error: err2 } = await supabase.from("tasks").select("*").limit(1);
      if (err2) {
        console.log("❌ Error:", err2.message);
      } else {
        console.log("✅ Columns found in first record:", Object.keys(cols[0] || {}));
      }
    } else {
      console.log("✅ Columns:", data);
    }
  } catch (err: any) {
    console.error("❌ Exception:", err.message);
  }
}

run();
