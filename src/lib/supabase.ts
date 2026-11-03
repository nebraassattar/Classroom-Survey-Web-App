import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Reuse one client so session refresh and Auth subscriptions share the same state.
let client: SupabaseClient | undefined
let publicClient: SupabaseClient | undefined
function buildClient(anonymous = false) {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !key)
    throw new Error('Supabase is not configured. Follow README.md.')
  if (key.startsWith('sb_secret_'))
    throw new Error('Use a browser-safe publishable key.')
  return createClient(url, key, {
    ...(anonymous
      ? {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storageKey: 'classroom-survey-public',
          },
        }
      : {}),
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
}
export function createSupabaseClient() {
  client ??= buildClient()
  return client
}
export function createPublicSupabaseClient() {
  publicClient ??= buildClient(true)
  return publicClient
}
