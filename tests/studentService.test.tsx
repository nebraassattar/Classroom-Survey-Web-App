import { beforeEach, expect, it, vi } from 'vitest'
import {
  browserToken,
  hasSubmitted,
  markSubmitted,
  studentApi,
  studentError,
} from '../src/lib/student'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('../src/lib/supabase', () => ({
  createPublicSupabaseClient: () => ({ rpc }),
}))
beforeEach(() => {
  localStorage.clear()
  rpc.mockReset()
})
it('reuses a stored UUID token and replaces malformed local values', () => {
  const token = browserToken()
  expect(browserToken()).toBe(token)
  localStorage.setItem('classroom-survey:browser-token', 'malformed')
  expect(browserToken()).not.toBe(token)
})
it('keeps per-survey submission markers separate', () => {
  markSubmitted('survey-a')
  expect(hasSubmitted('survey-a')).toBe(true)
  expect(hasSubmitted('survey-b')).toBe(false)
})
it('submits only through the anonymous atomic RPC with the specified payload', async () => {
  rpc.mockResolvedValue({
    data: { success: true, response_id: 'response-id' },
    error: null,
  })
  await studentApi.submit('survey-id', 'token', [
    { question_id: 'q', choice_id: 'c' },
  ])
  expect(rpc).toHaveBeenCalledWith('submit_survey_response', {
    p_survey_id: 'survey-id',
    p_anonymous_token: 'token',
    p_answers: [{ question_id: 'q', choice_id: 'c' }],
  })
})
it('rejects ambiguous server success instead of claiming the response was recorded', async () => {
  rpc.mockResolvedValue({ data: { success: false }, error: null })
  await expect(studentApi.submit('s', 't', [])).rejects.toThrow(
    'UNCONFIRMED_SUBMISSION',
  )
})
it('sorts loaded public questions and choices without mutating the source', async () => {
  const data = {
    state: 'active',
    survey: { id: 's', title: 'T', description: null },
    questions: [
      {
        id: 'q2',
        position: 2,
        question_text: 'Two',
        question_type: 'true_false',
        choices: [
          { id: 'f', position: 2, choice_text: 'False' },
          { id: 't', position: 1, choice_text: 'True' },
        ],
      },
      {
        id: 'q1',
        position: 1,
        question_text: 'One',
        question_type: 'multiple_choice',
        choices: [
          { id: 'b', position: 2, choice_text: 'B' },
          { id: 'a', position: 1, choice_text: 'A' },
        ],
      },
    ],
  }
  rpc.mockResolvedValue({ data, error: null })
  const result = await studentApi.load('slug')
  expect(rpc).toHaveBeenCalledWith('get_public_survey', { p_slug: 'slug' })
  if (result.state !== 'active') throw new Error('Expected active')
  expect(result.questions.map((q) => q.id)).toEqual(['q1', 'q2'])
  expect(result.questions[0].choices.map((c) => c.id)).toEqual(['a', 'b'])
  expect(data.questions[0].id).toBe('q2')
})
it('does not render malformed or empty active survey payloads', async () => {
  rpc.mockResolvedValue({
    data: { state: 'active', survey: { id: 's' }, questions: [] },
    error: null,
  })
  await expect(studentApi.load('slug')).rejects.toThrow('INVALID_PUBLIC_SURVEY')
})
it('never returns raw database/transport details in student messages', () => {
  expect(studentError(new Error('private database detail'))).not.toContain(
    'private database detail',
  )
  expect(studentError(new Error('INVALID_CHOICE'))).toContain(
    'Reload the survey',
  )
})
