/**
 * Configuration module
 * Loads and validates environment variables
 */

import { config } from 'dotenv';
import { z } from 'zod';

// Load .env file
config();

// Schema for environment variables
const envSchema = z.object({
  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  
  // Supabase
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  
  // Optional
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().optional(),
});

// Validate and parse
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parseResult.error.format());
  process.exit(1);
}

export const env = parseResult.data;

// Export typed config (renamed to avoid conflict)
export const appConfig = {
  telegram: {
    token: env.TELEGRAM_BOT_TOKEN,
  },
  supabase: {
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: env.SUPABASE_ANON_KEY,
  },
  app: {
    env: env.NODE_ENV,
    port: env.PORT ? parseInt(env.PORT, 10) : 3000,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
  },
} as const;

// Re-export as config for convenience
export { appConfig as config };
