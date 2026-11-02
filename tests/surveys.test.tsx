import { beforeEach, expect, it, vi } from 'vitest'
import {
  surveyApi,
  surveyError,
  type DraftContent,
  type Survey,
} from '../src/lib/surveys'

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), range: vi.fn() }))
vi.mock('../src/lib/supabase', () => ({
  createSupabaseClient: () => ({
    rpc: mocks.rpc,
    from: () => {
      const query = {
        select: () => query,
        order: () => query,
        range: mocks.range,
      }
      return query
    },
  }),
}))
beforeEach(() => {
  mocks.rpc.mockReset().mockResolvedValue({ data: 'saved-id', error: null })
  mocks.range.mockReset()
})
it('preserves every existing question and choice in position order during a metadata save', async () => {
  const content = {
    questions: [
      {
        question_text: 'Second',
        question_type: 'true_false',
        position: 2,
        choices: [
          { choice_text: 'False', position: 2 },
          { choice_text: 'True', position: 1 },
        ],
      },
      {
        question_text: 'First',
        question_type: 'multiple_choice',
        position: 1,
        choices: [
          { choice_text: 'B', position: 2 },
          { choice_text: 'A', position: 1 },
        ],
      },
    ],
  } as DraftContent
  const original = structuredClone(content)
  await surveyApi.save('survey-id', ' Title ', ' Description ', content)
  expect(mocks.rpc).toHaveBeenCalledWith('save_survey_draft', {
    p_survey_id: 'survey-id',
    p_title: 'Title',
    p_description: 'Description',
    p_questions: [
      {
        question_text: 'First',
        question_type: 'multiple_choice',
        choices: ['A', 'B'],
      },
      {
        question_text: 'Second',
        question_type: 'true_false',
        choices: ['True', 'False'],
      },
    ],
  })
  expect(content).toEqual(original)
})
it('creates an empty draft through the actual RPC contract', async () => {
  expect(await surveyApi.save(null, ' Title ', '')).toBe('saved-id')
  expect(mocks.rpc).toHaveBeenCalledWith('save_survey_draft', {
    p_survey_id: null,
    p_title: 'Title',
    p_description: null,
    p_questions: [],
  })
})
it('loads every API page rather than silently truncating the survey list', async () => {
  const firstPage = Array.from(
    { length: 500 },
    (_, i) => ({ id: String(i) }) as Survey,
  )
  mocks.range
    .mockResolvedValueOnce({ data: firstPage, error: null })
    .mockResolvedValueOnce({ data: [{ id: 'older' }], error: null })
  const data = await surveyApi.list()
  expect(data).toHaveLength(501)
  expect(data[500].id).toBe('older')
  expect(mocks.range).toHaveBeenNthCalledWith(1, 0, 499)
  expect(mocks.range).toHaveBeenNthCalledWith(2, 500, 999)
})
it('does not return a partial list after a later page fails', async () => {
  mocks.range
    .mockResolvedValueOnce({
      data: Array(500).fill({ id: 'fixture' }),
      error: null,
    })
    .mockResolvedValueOnce({ data: null, error: new Error('network') })
  await expect(surveyApi.list()).rejects.toThrow('network')
})
it('uses a generic friendly message instead of raw unexpected exceptions', () => {
  expect(surveyError(new Error('database private details'))).not.toContain(
    'private details',
  )
})
