import { expect, it } from 'vitest'
import {
  moveItem,
  newQuestion,
  serializeQuestions,
  validateDraft,
} from '../src/lib/draftEditor'

it('preserves stable question and choice identities across moves without mutating the source', () => {
  const first = newQuestion()
  const second = newQuestion()
  first.text = ' First '
  first.choices[0].text = ' A '
  first.choices[1].text = ' B '
  const before = [first, second]
  const moved = moveItem(before, 0, 1)
  expect(before[0]).toBe(first)
  expect(moved[1]).toBe(first)
  expect(moved[1].choices[0].key).toBe(first.choices[0].key)
  expect(serializeQuestions([first])).toEqual([
    {
      question_text: 'First',
      question_type: 'multiple_choice',
      position: 1,
      choices: [
        { choice_text: 'A', position: 1 },
        { choice_text: 'B', position: 2 },
      ],
    },
  ])
})
it('accepts complete drafts at length limits and rejects over-limit and whitespace-only content', () => {
  const q = newQuestion()
  q.text = 'x'.repeat(2000)
  q.choices[0].text = 'A'.repeat(1000)
  q.choices[1].text = 'B'
  expect(validateDraft('T'.repeat(200), 'D'.repeat(4000), [q])).toEqual({})
  expect(validateDraft('T'.repeat(201), 'D'.repeat(4001), [q])).toHaveProperty(
    'title',
  )
  q.text = '   '
  q.choices[0].text = ' '
  const errors = validateDraft('Title', '', [q])
  expect(errors[q.key]).toBeTruthy()
  expect(errors[q.choices[0].key]).toBeTruthy()
})
it('allows an empty saved draft but requires a question to activate, respecting database cardinality limits', () => {
  expect(validateDraft('Title', '', [])).toEqual({})
  expect(validateDraft('Title', '', [], true)).toHaveProperty('questions')
  expect(
    validateDraft(
      'Title',
      '',
      Array.from({ length: 101 }, () => newQuestion()),
    ),
  ).toHaveProperty('questions')
  const q = newQuestion()
  q.text = 'Question'
  q.choices = Array.from({ length: 21 }, (_, i) => ({
    key: String(i),
    text: 'Choice',
  }))
  expect(validateDraft('Title', '', [q])).toHaveProperty(`${q.key}-choices`)
})
