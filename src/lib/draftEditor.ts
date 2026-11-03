import type { DraftContent, Question } from './surveys'

export interface EditorChoice {
  key: string
  text: string
}
export interface EditorQuestion {
  key: string
  text: string
  type: Question['question_type']
  choices: EditorChoice[]
}
export const newChoice = (text = ''): EditorChoice => ({
  key: crypto.randomUUID(),
  text,
})
export function newQuestion(): EditorQuestion {
  return {
    key: crypto.randomUUID(),
    text: '',
    type: 'multiple_choice',
    choices: [newChoice(), newChoice()],
  }
}
export function loadQuestions(content: DraftContent): EditorQuestion[] {
  return [...content.questions]
    .sort((a, b) => a.position - b.position)
    .map((question) => ({
      key: crypto.randomUUID(),
      text: question.question_text,
      type: question.question_type,
      choices: [...question.choices]
        .sort((a, b) => a.position - b.position)
        .map((choice) => newChoice(choice.choice_text)),
    }))
}
export function serializeQuestions(questions: EditorQuestion[]): Question[] {
  return questions.map((question, index) => ({
    question_text: question.text.trim(),
    question_type: question.type,
    position: index + 1,
    choices: question.choices.map((choice, choiceIndex) => ({
      choice_text: choice.text.trim(),
      position: choiceIndex + 1,
    })),
  }))
}
export function validateDraft(
  title: string,
  description: string,
  questions: EditorQuestion[],
  activating = false,
) {
  const errors: Record<string, string> = {}
  if (!title.trim()) errors.title = 'Enter a survey title.'
  else if (title.trim().length > 200)
    errors.title = 'Use 200 characters or fewer.'
  if (description.length > 4000)
    errors.description = 'Use 4,000 characters or fewer.'
  if (activating && questions.length === 0)
    errors.questions = 'Add at least one question before activating.'
  if (questions.length > 100)
    errors.questions = 'Use no more than 100 questions.'
  for (const q of questions) {
    if (!q.text.trim()) errors[q.key] = 'Enter the question text.'
    else if (q.text.trim().length > 2000)
      errors[q.key] = 'Use 2,000 characters or fewer.'
    if (q.choices.length < 2 || q.choices.length > 20)
      errors[`${q.key}-choices`] = 'Provide between 2 and 20 choices.'
    for (const c of q.choices) {
      if (!c.text.trim()) errors[c.key] = 'Enter the choice text.'
      else if (c.text.trim().length > 1000)
        errors[c.key] = 'Use 1,000 characters or fewer.'
    }
  }
  return errors
}
export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const next = [...items]
  const destination = index + direction
  if (destination < 0 || destination >= next.length) return next
  ;[next[index], next[destination]] = [next[destination], next[index]]
  return next
}
