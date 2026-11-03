import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const create = vi.hoisted(() => vi.fn(() => ({ fixture: true })))
vi.mock('@supabase/supabase-js', () => ({ createClient: create }))
beforeEach(() => {
  vi.resetModules()
  create.mockClear()
  vi.stubEnv('VITE_SUPABASE_URL', 'https://project.example')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_fixture')
})
afterEach(() => vi.unstubAllEnvs())
it('keeps public and instructor clients separate and reuses each within its own scope', async () => {
  const { createSupabaseClient, createPublicSupabaseClient } =
    await import('../src/lib/supabase')
  const instructor = createSupabaseClient()
  const student = createPublicSupabaseClient()
  expect(instructor).not.toBe(student)
  expect(createSupabaseClient()).toBe(instructor)
  expect(createPublicSupabaseClient()).toBe(student)
  expect(create).toHaveBeenCalledTimes(2)
  expect(create).toHaveBeenNthCalledWith(
    2,
    'https://project.example',
    'sb_publishable_fixture',
    expect.objectContaining({
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'classroom-survey-public',
      },
    }),
  )
})
it('refuses an explicitly privileged secret key before constructing either client', async () => {
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_secret_fixture')
  const { createPublicSupabaseClient } = await import('../src/lib/supabase')
  expect(() => createPublicSupabaseClient()).toThrow(
    'browser-safe publishable key',
  )
  expect(create).not.toHaveBeenCalled()
})
