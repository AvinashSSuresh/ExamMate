import { createClient } from '@supabase/supabase-js';

// Read the credentials from the .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail early with a clear message if the .env file is missing or incomplete
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Check that .env contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart npm run dev.'
  );
}

// Single shared client used for authentication and all database queries
export const supabase = createClient(supabaseUrl, supabaseAnonKey);