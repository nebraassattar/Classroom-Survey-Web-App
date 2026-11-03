import { createPublicSupabaseClient } from './supabase'

export interface StudentChoice {
  id: string
  choice_text: string
  position: number
}
export interface StudentQuestion {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'true_false'
  position: number
  choices: StudentChoice[]
}
export type StudentSurvey =
  | { state: 'closed' | 'not_found' }
  | {
      state: 'active'
      survey: { id: string; title: string; description: string | null }
      questions: StudentQuestion[]
    }
export interface StudentAnswer {
  question_id: string
  choice_id: string
}
const tokenKey = 'classroom-survey:browser-token'
const markerKey = (surveyId: string) => `classroom-survey:submitted:${surveyId}`
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function browserToken() {
  try {
    const existing = localStorage.getItem(tokenKey)
    if (existing && uuid.test(existing)) return existing
    const token = crypto.randomUUID()
    localStorage.setItem(tokenKey, token)
    if (localStorage.getItem(tokenKey) !== token)
      throw new Error('Storage unavailable')
    return token
  } catch {
    throw new Error('STORAGE_UNAVAILABLE')
  }
}
export function hasSubmitted(surveyId: string) {
  try {
    return localStorage.getItem(markerKey(surveyId)) === 'true'
  } catch {
    return false
  }
}
export function markSubmitted(surveyId: string) {
  // The server's success remains valid if writing the optional UI marker fails.
  try {
    localStorage.setItem(markerKey(surveyId), 'true')
  } catch {
    /* The token/DB uniqueness still protects retries. */
  }
}
export function studentErrorCode(error: unknown) {
  return error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : ''
}
export function studentError(error: unknown) {
  const messages: Record<string, string> = {
    SURVEY_NOT_ACTIVE: 'This survey is no longer accepting responses.',
    DUPLICATE_RESPONSE: 'You have already submitted a response to this survey.',
    MISSING_REQUIRED_ANSWER: 'Please answer every question before submitting.',
    INVALID_QUESTION:
      'The survey could not validate your answers. Reload the survey and try again.',
    INVALID_CHOICE:
      'The survey could not validate your answers. Reload the survey and try again.',
    INVALID_ANSWER:
      'The survey could not validate your answers. Reload the survey and try again.',
    INVALID_ANSWERS:
      'The survey could not validate your answers. Reload the survey and try again.',
    DUPLICATE_QUESTION:
      'The survey could not validate your answers. Reload the survey and try again.',
    INVALID_TOKEN:
      'Your browser could not identify this submission. Check browser storage and try again.',
    STORAGE_UNAVAILABLE:
      'Browser storage is unavailable. Allow storage for this site, then submit again. Your answers are still here.',
  }
  return (
    messages[studentErrorCode(error)] ??
    'We could not confirm your submission. Check your connection and try again. Retrying from this browser will not record a second response.'
  )
}
export const studentApi = {
  async load(slug: string): Promise<StudentSurvey> {
    const { data, error } = await createPublicSupabaseClient().rpc(
      'get_public_survey',
      { p_slug: slug },
    )
    if (error) throw error
    if (!data || !['active', 'closed', 'not_found'].includes(data.state))
      throw new Error('INVALID_PUBLIC_SURVEY')
    if (data.state === 'active') {
      if (
        !data.survey?.id ||
        !Array.isArray(data.questions) ||
        data.questions.length === 0 ||
        data.questions.some(
          (q: StudentQuestion) =>
            !q.id || !Array.isArray(q.choices) || q.choices.length < 2,
        )
      )
        throw new Error('INVALID_PUBLIC_SURVEY')
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
    return data as StudentSurvey
  },
  async submit(surveyId: string, token: string, answers: StudentAnswer[]) {
    const { data, error } = await createPublicSupabaseClient().rpc(
      'submit_survey_response',
      { p_survey_id: surveyId, p_anonymous_token: token, p_answers: answers },
    )
    if (error) throw error
    if (data?.success !== true || typeof data.response_id !== 'string')
      throw new Error('UNCONFIRMED_SUBMISSION')
  },
}
