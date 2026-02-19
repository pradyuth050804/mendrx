// File: src/lib/supabase-auth.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { type SupabaseClient } from '@supabase/supabase-js';

export type AuthClient = Pick<SupabaseClient, 'auth'>;

let authClientInstance: AuthClient | null = null;

export function createAuthClient(): AuthClient {
  if (authClientInstance) {
    return authClientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables.');
  }

  const client = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  });

  authClientInstance = { auth: client.auth };
  return authClientInstance;
}