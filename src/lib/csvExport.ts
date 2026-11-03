import { createSupabaseClient } from './supabase'
import type { Survey } from './surveys'

export interface ExportQuestion {
  id: string
  question_text: string
  position: number
  choices: { id: string; choice_text: string; position: number }[]
}
export interface ExportResponse {
  id: string
  submitted_at: string
  answers: { question_id: string; choice_id: string }[]
}
export interface SurveyExport {
  survey: Pick<
    Survey,
    'id' | 'title' | 'description' | 'status' | 'created_at' | 'public_slug'
  >
  questions: ExportQuestion[]
  responses: ExportResponse[]
}
function invalid(): never {
  throw new Error('INVALID_EXPORT')
}
export function createSurveyCsv(data: SurveyExport) {
  if (
    !data?.survey?.id ||
    !Array.isArray(data.questions) ||
    !Array.isArray(data.responses)
  )
    return invalid()
  const questions = [...data.questions].sort((a, b) => a.position - b.position)
  const choices = new Map<string, Map<string, string>>()
  for (const q of questions) {
    if (
      !q?.id ||
      typeof q.question_text !== 'string' ||
      !Array.isArray(q.choices) ||
      choices.has(q.id)
    )
      return invalid()
    choices.set(q.id, new Map(q.choices.map((c) => [c.id, c.choice_text])))
  }
  const headers = [
    'survey_id',
    'survey_title',
    'survey_description',
    'survey_status',
    'survey_created_at',
    'public_slug',
    'response_id',
    'submitted_at',
    ...questions.map((q, index) => `Q${index + 1}. ${q.question_text}`),
  ]
  const metadata = [
    data.survey.id,
    data.survey.title,
    data.survey.description ?? '',
    data.survey.status,
    data.survey.created_at,
    data.survey.public_slug ?? '',
  ]
  const ids = new Set<string>()
  const rows = [headers]
  for (const response of data.responses) {
    if (
      !response?.id ||
      ids.has(response.id) ||
      !Number.isFinite(Date.parse(response.submitted_at)) ||
      !Array.isArray(response.answers)
    )
      return invalid()
    ids.add(response.id)
    const answers = new Map<string, string>()
    for (const answer of response.answers) {
      const text = choices.get(answer.question_id)?.get(answer.choice_id)
      if (typeof text !== 'string' || answers.has(answer.question_id))
        return invalid()
      answers.set(answer.question_id, text)
    }
    rows.push([
      ...metadata,
      response.id,
      response.submitted_at,
      ...questions.map((q) => answers.get(q.id) ?? ''),
    ])
  }
  return (
    '\uFEFF' +
    rows.map((row) => row.map(csvCell).join(',')).join('\r\n') +
    '\r\n'
  )
}
export function csvCell(value: string) {
  if (typeof value !== 'string') return invalid()
  let safe = value.replaceAll(String.fromCharCode(0), '')
  // Quoting handles structure, while a text prefix prevents spreadsheet formulas.
  let start = 0
  while (
    start < safe.length &&
    (safe.charCodeAt(start) <= 32 || /\s/u.test(safe[start]))
  )
    start++
  if (
    (start < safe.length && '=+-@'.includes(safe[start])) ||
    ['\t', '\r', '\n'].some((prefix) => safe.startsWith(prefix))
  )
    safe = "'" + safe
  return '"' + safe.replace(/"/g, '""') + '"'
}
export const csvApi = {
  async get(id: string) {
    const { data, error } = await createSupabaseClient().rpc(
      'get_survey_export',
      { p_survey_id: id },
    )
    if (error) throw error
    if (
      data?.survey?.id !== id ||
      !Array.isArray(data.questions) ||
      !Array.isArray(data.responses)
    )
      throw new Error('INVALID_EXPORT')
    return data as SurveyExport
  },
}
export function csvError(error: unknown) {
  const value =
    error && typeof error === 'object'
      ? (error as { message?: string; code?: string })
      : {}
  if (value.code === 'PGRST202' || value.code === '42883')
    return 'CSV export needs the export database migration. Follow the Supabase setup guide, then try again.'
  if (value.message === 'INVALID_EXPORT')
    return 'The export data could not be validated. Refresh results and try again.'
  if (value.message === 'INSTRUCTOR_REQUIRED' || value.code === '42501')
    return 'Instructor access is required to export responses. Sign in again or contact the administrator.'
  return 'Unable to export responses. Check your connection and try again.'
}
export function downloadSurveyCsv(id: string, csv: string) {
  const url = URL.createObjectURL(
    new Blob([csv], { type: 'text/csv;charset=utf-8' }),
  )
  const link = document.createElement('a')
  try {
    link.href = url
    link.download = `survey-${id}-results.csv`
    document.body.append(link)
    link.click()
  } finally {
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
