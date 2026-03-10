import { createClient } from '@supabase/supabase-js';

// Vite exposes env vars via import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // In dev we warn, but in production a missing value will cause Supabase client to throw
  // a generic "supabaseUrl is required" error. Provide a clearer log to help debugging.
  // eslint-disable-next-line no-console
  console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Ensure you set these as environment variables during build/deploy (e.g., in Netlify UI or .env).');
}

// If values are missing at runtime, createClient will throw. To fail early with a clearer message
// we explicitly check and throw when running in production.
if (import.meta.env.PROD && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('[Supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required in production. Set them in your deployment environment.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
