import { beforeEach, expect, it, vi } from 'vitest'
import {
  normalizeResults,
  resultsApi,
  type SurveyResults,
} from '../src/lib/results'
const rpc = vi.hoisted(() => vi.fn())
vi.mock('../src/lib/supabase', () => ({
  createSupabaseClient: () => ({ rpc }),
}))
const data: SurveyResults = {
  survey_id: 's',
  response_count: 3,
  questions: [
    {
      question_id: 'q',
      question_text: 'Question',
      position: 1,
      response_count: 3,
      choices: [
        {
          choice_id: 'b',
          choice_text: 'B',
          position: 2,
          count: 1,
          percentage: 33.3,
        },
        {
          choice_id: 'a',
          choice_text: 'A',
          position: 1,
          count: 2,
          percentage: 66.7,
        },
      ],
    },
  ],
}
beforeEach(() => rpc.mockReset())
it('calls only the instructor aggregation RPC and sorts choice order without mutating source data', async () => {
  rpc.mockResolvedValue({ data, error: null })
  const result = await resultsApi.get('s')
  expect(rpc).toHaveBeenCalledWith('get_survey_results', { p_survey_id: 's' })
  expect(result.questions[0].choices.map((c) => c.choice_id)).toEqual([
    'a',
    'b',
  ])
  expect(data.questions[0].choices[0].choice_id).toBe('b')
})
it('propagates server authorization errors instead of returning empty results', async () => {
  rpc.mockResolvedValue({ data: null, error: new Error('INSTRUCTOR_REQUIRED') })
  await expect(resultsApi.get('s')).rejects.toThrow('INSTRUCTOR_REQUIRED')
})
it('rejects invalid counts, mismatched surveys and non-finite percentages', () => {
  expect(() => normalizeResults({ ...data, survey_id: 'other' }, 's')).toThrow(
    'INVALID_RESULTS',
  )
  expect(() => normalizeResults({ ...data, response_count: -1 }, 's')).toThrow(
    'INVALID_RESULTS',
  )
  const bad = structuredClone(data)
  bad.questions[0].choices[0].percentage = NaN
  expect(() => normalizeResults(bad, 's')).toThrow('INVALID_RESULTS')
  const mismatched = structuredClone(data)
  mismatched.questions[0].response_count = 2
  expect(() => normalizeResults(mismatched, 's')).toThrow('INVALID_RESULTS')
})
