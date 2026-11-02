import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Reuse one client so session refresh and Auth subscriptions share the same state.
let client: SupabaseClient | undefined
export function createSupabaseClient() {
  if (client) return client
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !key)
    throw new Error('Supabase is not configured. Follow README.md.')
  if (key.startsWith('sb_secret_'))
    throw new Error('Use a browser-safe publishable key.')
  client = createClient(url, key, {
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: AbortSignal.any([
            ...(init?.signal ? [init.signal] : []),
            AbortSignal.timeout(15000),
          ]),
        }),
    },
  })
  return client
}
