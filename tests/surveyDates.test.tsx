import { expect, it } from 'vitest'
import { matchesSurveyDates, surveyDateKey } from '../src/lib/surveyDates'

it('uses the displayed calendar day rather than the UTC date around midnight', () => {
  expect(surveyDateKey('2026-11-03T01:00:00Z', 'America/New_York')).toBe(
    '2026-11-02',
  )
  expect(
    matchesSurveyDates(
      '2026-11-03T01:00:00Z',
      '2026-11-02',
      '2026-11-02',
      'America/New_York',
    ),
  ).toBe(true)
  expect(
    matchesSurveyDates(
      '2026-11-03T01:00:00Z',
      '2026-11-03',
      '',
      'America/New_York',
    ),
  ).toBe(false)
})
it('includes the complete daylight-saving transition day, and excludes the following midnight', () => {
  for (const timestamp of [
    '2026-11-01T04:00:00Z',
    '2026-11-01T05:30:00Z',
    '2026-11-01T06:30:00Z',
    '2026-11-02T04:59:59Z',
  ]) {
    expect(
      matchesSurveyDates(
        timestamp,
        '2026-11-01',
        '2026-11-01',
        'America/New_York',
      ),
    ).toBe(true)
  }
  expect(
    matchesSurveyDates(
      '2026-11-02T05:00:00Z',
      '2026-11-01',
      '2026-11-01',
      'America/New_York',
    ),
  ).toBe(false)
})
it('supports inclusive one-sided bounds without filtering records when no dates are selected', () => {
  expect(
    matchesSurveyDates('2026-11-03T12:00:00Z', '2026-11-03', '', 'UTC'),
  ).toBe(true)
  expect(
    matchesSurveyDates('2026-11-03T23:59:59Z', '', '2026-11-03', 'UTC'),
  ).toBe(true)
  expect(
    matchesSurveyDates('2026-11-04T00:00:00Z', '', '2026-11-03', 'UTC'),
  ).toBe(false)
  expect(matchesSurveyDates('invalid', '', '')).toBe(true)
  expect(matchesSurveyDates('invalid', '2026-11-03', '')).toBe(false)
})
