import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().transform((val) => parseInt(val, 10)).default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().url('Invalid Supabase URL format'),
  SUPABASE_ANON_KEY: z.string().min(1, 'Supabase Anon Key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase Service Role Key is required'),
  GEMINI_API_KEY: z.string().min(1, 'Gemini API Key is required'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errorMsg = JSON.stringify(parsed.error.format(), null, 2);
  console.error('❌ Invalid environment configuration variables:');
  console.error(errorMsg);
  throw new Error(`Invalid environment configuration: ${errorMsg}`);
}

export const config = parsed.data;
