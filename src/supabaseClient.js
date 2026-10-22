import { createClient } from '@supabase/supabase-js';

const defaultSupabaseUrl = 'https://tcoxhlhxhsqktztlwqvw.supabase.co';
const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjb3hobGh4aHNxa3R6dGx3cXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNjQ2MDksImV4cCI6MjEwMTk0MDYwOX0.q3asDVQaAoCedrDr1xINCrZP7bjg8bcUGY-JXMGzdzo';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultAnonKey;

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set in environment; using fallback configuration.');
}

let client;
try {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
} catch (error) {
  console.error('Supabase client initialization failed, falling back to mock client:', error);
  client = {
    auth: {
      signInWithOAuth: async () => ({ data: null, error: new Error('Supabase client unavailable') }),
      signInWithPassword: async () => ({ data: {}, error: new Error('Supabase client unavailable') }),
      signUp: async () => ({ data: {}, error: new Error('Supabase client unavailable') }),
      signOut: async () => ({ error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      unlinkIdentity: async () => ({ error: new Error('Supabase client unavailable') }),
    },
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
    }),
  };
}

export const supabase = client;
