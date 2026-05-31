import { createClient } from "@supabase/supabase-js";

// Read from environment variables, fallback to local development defaults matching the backend configuration
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "https://gvhiiyjhyvtzdkbrnbea.supabase.co").replace(/\/rest\/v1\/?$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2aGlpeWpoeXZ0emRrYnJuYmVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMDMxODYsImV4cCI6MjA5NTU3OTE4Nn0.RTEs8kW6-yXlxz9NXHrFMCxITZIWZ4zykTbBMu46VQA";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
