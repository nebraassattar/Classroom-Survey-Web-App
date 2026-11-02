import { createClient } from '@supabase/supabase-js'

// Lazy initialization keeps the setup preview usable without external configuration.
// This is a real client, not a mock. RLS and RPC authorization must precede data use.
export function createSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !key)
    throw new Error('Supabase is not configured. Follow README.md.')
  return createClient(url, key)
}
