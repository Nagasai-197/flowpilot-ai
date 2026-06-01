import { User } from "@supabase/supabase-js";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      email?: string;
      role?: string;
      user_metadata?: Record<string, any>;
    };
  }
}
