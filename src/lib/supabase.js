import { createClient } from '@supabase/supabase-js';

const getEnv = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || '';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || '';

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-supabase-project-id')) {
  console.warn(
    '[UrbanWatch AI] Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
