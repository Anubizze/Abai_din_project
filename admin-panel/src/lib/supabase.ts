/**
 * Supabase client for admin panel (client components)
 * Uses cookies to sync with middleware
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Check environment variables at runtime, not at module load time
// This prevents build failures if env vars are not available during build
function validateEnvVars() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // In development, show helpful error
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Missing Supabase environment variables!');
      console.error('Create .env.local file in admin-panel folder with:');
      console.error('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
      console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key');
    }
    throw new Error('Missing Supabase environment variables. See SETUP_INSTRUCTIONS.md');
  }
}

// For client components, use createClientComponentClient
// This syncs with middleware via cookies
// Must be called inside client components, not at module level
export function getSupabaseClient() {
  // Validate env vars at runtime
  validateEnvVars();
  return createClientComponentClient();
}

// For backward compatibility, but components should use getSupabaseClient()
// This will work but may not sync cookies properly
let _supabaseClient: ReturnType<typeof createClientComponentClient> | null = null;

export const supabase = new Proxy({} as ReturnType<typeof createClientComponentClient>, {
  get(target, prop) {
    // Validate env vars at runtime
    validateEnvVars();
    if (!_supabaseClient) {
      _supabaseClient = createClientComponentClient();
    }
    return (_supabaseClient as any)[prop];
  }
});
