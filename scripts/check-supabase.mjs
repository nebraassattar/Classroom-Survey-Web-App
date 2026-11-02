import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

// Read-only hosted checks. Print status only, never config, headers or raw errors.
const url = process.env.VITE_SUPABASE_URL?.trim()
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
if (!url || !key || key.startsWith('sb_secret_'))
  throw new Error(
    'Configure the project URL and browser-safe publishable key locally.',
  )
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input, init) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
  },
})
let failed = false
function check(name, pass) {
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}`)
  if (!pass) failed = true
}
try {
  const { data, error } = await client.rpc('get_public_survey', {
    p_slug: randomUUID(),
  })
  check(
    'Hosted public survey RPC reachable; unknown slug returns not_found',
    !error && data?.state === 'not_found',
  )
  const responseRead = await client.from('responses').select('id').limit(1)
  check('Anonymous response reads denied', responseRead.error?.code === '42501')
  const answerRead = await client.from('answers').select('id').limit(1)
  check('Anonymous answer reads denied', answerRead.error?.code === '42501')
  const resultRead = await client.rpc('get_survey_results', {
    p_survey_id: randomUUID(),
  })
  check('Anonymous results RPC denied', resultRead.error?.code === '42501')
  const settings = await fetch(new URL('/auth/v1/settings', url), {
    headers: { apikey: key },
    signal: AbortSignal.timeout(15000),
  })
  const configuration = await settings.json()
  check(
    'Hosted Auth reports public signup disabled',
    settings.ok && configuration.disable_signup === true,
  )
} catch {
  failed = true
  console.log(
    'FAIL: hosted request unavailable; check local configuration and network.',
  )
}
if (failed) process.exitCode = 1
