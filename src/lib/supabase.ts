/**
 * Supabase Client Configuration
 * 
 * Singleton Supabase client instance for the entire application.
 * Uses VITE_ prefixed env vars so Vite exposes them to the browser bundle.
 * 
 * In production (Vercel), API calls are proxied through the app's own domain
 * via vercel.json rewrites to bypass ISP blocks on supabase.co in Indonesia.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const directSupabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

if (!directSupabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file.',
  );
}

// In production, route Supabase API calls through Vercel rewrites (same origin)
// to bypass ISP blocks on supabase.co domain in Indonesia.
// In development, use the direct Supabase URL.
const isProduction = import.meta.env.PROD;
const supabaseUrl = isProduction && typeof window !== 'undefined'
  ? window.location.origin
  : directSupabaseUrl;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    // Must be true to handle OAuth redirect tokens (Google login)
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

export default supabase;
