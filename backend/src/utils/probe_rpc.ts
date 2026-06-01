import { supabase } from "../lib/supabase.js";

async function run() {
  console.log("Probing for SQL execution RPCs...");

  const queries = [
    { name: "exec_sql", params: { sql: "SELECT 1;" } },
    { name: "execute_sql", params: { query: "SELECT 1;" } },
    { name: "run_sql", params: { sql: "SELECT 1;" } },
  ];

  for (const q of queries) {
    try {
      const { data, error } = await supabase.rpc(q.name, q.params);
      if (error) {
        console.log(`❌ RPC '${q.name}' failed:`, error.message, error.code);
      } else {
        console.log(`✅ RPC '${q.name}' SUCCEEDED! Result:`, data);
      }
    } catch (err: any) {
      console.log(`❌ RPC '${q.name}' crashed:`, err.message);
    }
  }
}

run();
