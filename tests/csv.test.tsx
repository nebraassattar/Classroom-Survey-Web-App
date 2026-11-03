import { beforeEach, expect, it, vi } from 'vitest'
import { parse } from 'csv-parse/sync'
import {
  createSurveyCsv,
  csvApi,
  csvCell,
  csvError,
  type SurveyExport,
} from '../src/lib/csvExport'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('../src/lib/supabase', () => ({
  createSupabaseClient: () => ({ rpc }),
}))
const fixture: SurveyExport = {
  survey: {
    id: 'survey-id',
    title: 'Café, "recursion"',
    description: 'First line\nSecond line',
    status: 'closed',
    created_at: '2026-11-01T12:00:00Z',
    public_slug: 'slug',
  },
  questions: [
    {
      id: 'q2',
      question_text: 'Same question?',
      position: 2,
      choices: [
        { id: 't', choice_text: 'True', position: 1 },
        { id: 'f', choice_text: 'False', position: 2 },
      ],
    },
    {
      id: 'q1',
      question_text: 'Same question?',
      position: 1,
      choices: [
        { id: 'a', choice_text: 'A, "quoted"\nanswer 🎓', position: 1 },
        { id: 'b', choice_text: 'B', position: 2 },
      ],
    },
  ],
  responses: [
    {
      id: 'response-a',
      submitted_at: '2026-11-02T14:00:00Z',
      answers: [
        { question_id: 'q2', choice_id: 't' },
        { question_id: 'q1', choice_id: 'a' },
      ],
    },
    {
      id: 'response-b',
      submitted_at: '2026-11-02T15:00:00Z',
      answers: [
        { question_id: 'q1', choice_id: 'b' },
        { question_id: 'q2', choice_id: 'f' },
      ],
    },
  ],
}
beforeEach(() => rpc.mockReset())
it('round-trips commas, quotes, Unicode, newlines, metadata and one row per response through an independent parser', () => {
  const original = structuredClone(fixture)
  const csv = createSurveyCsv(fixture)
  expect(csv.startsWith('\uFEFF')).toBe(true)
  expect(csv.endsWith('\r\n')).toBe(true)
  const rows = parse(csv, { bom: true }) as string[][]
  expect(rows).toHaveLength(3)
  expect(rows[0].slice(-2)).toEqual([
    'Q1. Same question?',
    'Q2. Same question?',
  ])
  expect(rows[1]).toEqual([
    'survey-id',
    'Café, "recursion"',
    'First line\nSecond line',
    'closed',
    '2026-11-01T12:00:00Z',
    'slug',
    'response-a',
    '2026-11-02T14:00:00Z',
    'A, "quoted"\nanswer 🎓',
    'True',
  ])
  expect(rows[2].slice(-2)).toEqual(['B', 'False'])
  expect(fixture).toEqual(original)
  expect(csv).not.toContain('anonymous_token')
})
it.each([
  '=SUM(1,2)',
  ' +cmd',
  '-2',
  '@command',
  '\t=HYPERLINK("x")',
  '\rplain',
  '\nplain',
])('prefixes spreadsheet-active text as literal text: %j', (text) => {
  const row = parse(csvCell(text) + '\r\n') as string[][]
  expect(row[0][0]).toBe("'" + text)
})
it('exports absent historical answers as empty cells without inventing values', () => {
  const data = structuredClone(fixture)
  data.responses[0].answers = [{ question_id: 'q1', choice_id: 'a' }]
  const rows = parse(createSurveyCsv(data), { bom: true }) as string[][]
  expect(rows[1].at(-1)).toBe('')
})
it('rejects mismatched relationships and duplicate response IDs rather than exporting wrong answers', () => {
  const data = structuredClone(fixture)
  data.responses[0].answers[0].choice_id = 'a'
  expect(() => createSurveyCsv(data)).toThrow('INVALID_EXPORT')
  const duplicate = structuredClone(fixture)
  duplicate.responses[1].id = 'response-a'
  expect(() => createSurveyCsv(duplicate)).toThrow('INVALID_EXPORT')
})
it('fetches the snapshot only through the instructor export RPC and preserves authorization errors', async () => {
  rpc.mockResolvedValueOnce({ data: fixture, error: null })
  expect(await csvApi.get('survey-id')).toEqual(fixture)
  expect(rpc).toHaveBeenCalledWith('get_survey_export', {
    p_survey_id: 'survey-id',
  })
  rpc.mockResolvedValueOnce({
    data: null,
    error: new Error('INSTRUCTOR_REQUIRED'),
  })
  await expect(csvApi.get('survey-id')).rejects.toThrow('INSTRUCTOR_REQUIRED')
})
it('explains a missing hosted migration without leaking database details', () => {
  expect(csvError({ code: 'PGRST202', message: 'private details' })).toContain(
    'database migration',
  )
  expect(csvError(new Error('private details'))).not.toContain(
    'private details',
  )
})
