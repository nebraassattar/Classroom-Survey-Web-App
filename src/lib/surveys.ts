import { createSupabaseClient } from './supabase'

export type SurveyStatus = 'draft' | 'active' | 'closed' | 'archived'
export interface Survey {
  id: string
  title: string
  description: string | null
  status: SurveyStatus
  public_slug: string | null
  created_at: string
  updated_at: string
}
export interface Question {
  question_text: string
  question_type: 'multiple_choice' | 'true_false'
  position: number
  choices: { choice_text: string; position: number }[]
}
export interface DraftContent extends Survey {
  questions: Question[]
}

export function surveyError(error: unknown): string {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : ''
  const messages: Record<string, string> = {
    SURVEY_HAS_NO_QUESTIONS:
      'Add at least one question before activating this survey.',
    INVALID_CHOICES:
      'Each question needs at least two choices before activation.',
    SURVEY_NOT_EDITABLE:
      'This survey can no longer be edited. Duplicate it to create a new draft.',
    INVALID_SURVEY_STATE:
      'The survey has changed or this action is unavailable. Refresh the list.',
    SURVEY_NOT_ACTIVE: 'This survey is no longer active. Refresh the list.',
    SURVEY_NOT_FOUND: 'Survey not found or no longer available.',
    INSTRUCTOR_REQUIRED:
      'Instructor access is required. Sign in again or contact the administrator.',
    INVALID_TRUE_FALSE:
      'True/False questions must have exactly True and False choices.',
    TOO_MANY_QUESTIONS: 'Use no more than 100 questions.',
    INVALID_QUESTIONS: 'Check your question content and try again.',
  }
  return (
    messages[message] ??
    'Unable to complete the request. Check your connection and try again.'
  )
}

export const surveyApi = {
  async list() {
    // Fetch all pages so search/filter never silently excludes older surveys.
    const surveys: Survey[] = []
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await createSupabaseClient()
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + 499)
      if (error) throw error
      const page = data as Survey[]
      surveys.push(...page)
      if (page.length < 500) return surveys
    }
  },
  async get(id: string) {
    const { data, error } = await createSupabaseClient()
      .from('surveys')
      .select(
        '*, questions(question_text, question_type, position, choices(choice_text, position))',
      )
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('SURVEY_NOT_FOUND')
    return data as DraftContent
  },
  async save(
    id: string | null,
    title: string,
    description: string,
    content?: Pick<DraftContent, 'questions'>,
  ) {
    const questions = [...(content?.questions ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((q) => ({
        question_text: q.question_text,
        question_type: q.question_type,
        choices: [...q.choices]
          .sort((a, b) => a.position - b.position)
          .map((c) => c.choice_text),
      }))
    const { data, error } = await createSupabaseClient().rpc(
      'save_survey_draft',
      {
        p_survey_id: id,
        p_title: title.trim(),
        p_description: description.trim() || null,
        p_questions: questions,
      },
    )
    if (error) throw error
    return data as string
  },
  async mutate(
    action: 'activate' | 'close' | 'archive' | 'delete' | 'duplicate',
    id: string,
  ) {
    const { data, error } = await createSupabaseClient().rpc(
      `${action}_survey`,
      { p_survey_id: id },
    )
    if (error) throw error
    return data as
      string | { id: string; status: SurveyStatus; public_slug: string } | null
  },
  async responseCount(id: string) {
    const { count, error } = await createSupabaseClient()
      .from('responses')
      .select('id', { count: 'exact', head: true })
      .eq('survey_id', id)
    if (error) throw error
    return count ?? 0
  },
}
