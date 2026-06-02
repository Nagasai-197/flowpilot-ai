import { createClient } from "@supabase/supabase-js";

// Read from environment variables. No fallbacks are allowed in production mode.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (typeof window !== "undefined" && (!supabaseUrl || !supabaseAnonKey)) {
  console.error(
    "Warning: Supabase environment variables are missing! Make sure to configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );

  if (import.meta.env.PROD) {
    throw new Error(
      "Supabase environment variables are required in production. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
}

// Fallback only supports build/static analysis and local misconfiguration screens.
export const supabase = createClient(
  supabaseUrl || "https://placeholder-project.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
);
