import { User } from '@supabase/supabase-js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role?: string;
        user_metadata?: Record<string, any>;
      };
    }
  }
}
