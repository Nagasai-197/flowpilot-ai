import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import ws from 'ws';

if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase initialization parameters in config');
}

const sanitizedUrl = config.SUPABASE_URL.replace(/\/rest\/v1\/?$/, '');

// Client for backend service operations (uses service role key to bypass RLS, secured programmatically by user_id)
export const supabase = createClient(
  sanitizedUrl,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      transport: ws,
    } as any,
  }
);

export type SupabaseClientType = typeof supabase;
