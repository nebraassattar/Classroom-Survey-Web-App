import { createSupabaseClient } from './supabase'

export interface ChoiceResult {
  choice_id: string
  choice_text: string
  position: number
  count: number
  percentage: number
}
export interface QuestionResult {
  question_id: string
  question_text: string
  position: number
  response_count: number
  choices: ChoiceResult[]
}
export interface SurveyResults {
  survey_id: string
  response_count: number
  questions: QuestionResult[]
}
function count(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
export function normalizeResults(
  data: SurveyResults,
  id: string,
): SurveyResults {
  if (
    !data ||
    data.survey_id !== id ||
    !count(data.response_count) ||
    !Array.isArray(data.questions)
  )
    throw new Error('INVALID_RESULTS')
  for (const q of data.questions) {
    if (
      !q ||
      !q.question_id ||
      typeof q.question_text !== 'string' ||
      !count(q.position) ||
      q.position < 1 ||
      !count(q.response_count) ||
      q.response_count > data.response_count ||
      !Array.isArray(q.choices)
    )
      throw new Error('INVALID_RESULTS')
    for (const c of q.choices)
      if (
        !c ||
        !c.choice_id ||
        typeof c.choice_text !== 'string' ||
        !count(c.position) ||
        c.position < 1 ||
        !count(c.count) ||
        c.count > q.response_count ||
        typeof c.percentage !== 'number' ||
        !Number.isFinite(c.percentage) ||
        c.percentage < 0 ||
        c.percentage > 100
      )
        throw new Error('INVALID_RESULTS')
    if (q.choices.reduce((total, c) => total + c.count, 0) !== q.response_count)
      throw new Error('INVALID_RESULTS')
  }
  return {
    ...data,
    questions: [...data.questions]
      .sort((a, b) => a.position - b.position)
      .map((q) => ({
        ...q,
        choices: [...q.choices].sort((a, b) => a.position - b.position),
      })),
  }
}
export const resultsApi = {
  async get(id: string) {
    const { data, error } = await createSupabaseClient().rpc(
      'get_survey_results',
      { p_survey_id: id },
    )
    if (error) throw error
    return normalizeResults(data as SurveyResults, id)
  },
}
export function resultsAccessDenied(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const value = error as { message?: string; code?: string; status?: number }
  return (
    value.message === 'INSTRUCTOR_REQUIRED' ||
    ['42501', 'PGRST301', 'PGRST302'].includes(value.code ?? '') ||
    value.status === 401 ||
    value.status === 403
  )
}
