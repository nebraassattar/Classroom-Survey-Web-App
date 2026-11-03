import { cloneElement, type ReactElement } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ResultsPage } from '../src/pages/ResultsPage'
import { resultsApi, type SurveyResults } from '../src/lib/results'
import { surveyApi, type Survey } from '../src/lib/surveys'

vi.mock('../src/lib/results', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/results')>()
  return { ...actual, resultsApi: { get: vi.fn() } }
})
vi.mock('../src/lib/surveys', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/surveys')>()
  return { ...actual, surveyApi: { summary: vi.fn() } }
})
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  // JSDOM has no layout: fix only the container dimensions, keeping the real chart.
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: ReactElement<{ width: number; height: number }>
    }) => cloneElement(children, { width: 640, height: 240 }),
  }
})
const survey: Survey = {
  id: 'survey-id',
  title: 'Recursion results',
  description: null,
  status: 'active',
  public_slug: 'slug',
  created_at: '2026-11-02',
  updated_at: '2026-11-02',
}
const result: SurveyResults = {
  survey_id: 'survey-id',
  response_count: 3,
  questions: [
    {
      question_id: 'q1',
      question_text: 'Which is correct?',
      position: 1,
      response_count: 3,
      choices: [
        {
          choice_id: 'a',
          choice_text: 'A base case',
          position: 1,
          count: 2,
          percentage: 66.7,
        },
        {
          choice_id: 'b',
          choice_text: 'An endless loop',
          position: 2,
          count: 1,
          percentage: 33.3,
        },
        {
          choice_id: 'c',
          choice_text: 'No stopping rule',
          position: 3,
          count: 0,
          percentage: 0,
        },
      ],
    },
  ],
}
function mount() {
  return render(
    <MemoryRouter initialEntries={['/surveys/survey-id/results']}>
      <Routes>
        <Route path="/surveys/:id/results" element={<ResultsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.mocked(surveyApi.summary)
    .mockReset()
    .mockResolvedValue({ ...survey })
  vi.mocked(resultsApi.get)
    .mockReset()
    .mockResolvedValue(structuredClone(result))
})
afterEach(() => vi.unstubAllGlobals())
describe('instructor results', () => {
  it('clears a prior snapshot if a later refresh says the survey no longer exists', async () => {
    mount()
    await screen.findByRole('table')
    vi.mocked(resultsApi.get).mockRejectedValue({
      message: 'SURVEY_NOT_FOUND',
      code: 'P0001',
    })
    await userEvent.click(
      screen.getByRole('button', { name: 'Refresh results' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Survey not found',
    )
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
  it('renders database counts, percentages, zero-count choices and the real Recharts SVG', async () => {
    const view = mount()
    await screen.findByRole('heading', { name: 'Recursion results' })
    expect(screen.getByText('Active · 3 responses')).toBeInTheDocument()
    expect(screen.getByText('3 answered · 0 unanswered')).toBeInTheDocument()
    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('A base case266.7%')
    expect(rows[2]).toHaveTextContent('An endless loop133.3%')
    expect(rows[3]).toHaveTextContent('No stopping rule00.0%')
    expect(
      view.container.querySelector('svg.recharts-surface'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Present QR' })).toHaveAttribute(
      'href',
      '/surveys/survey-id/present',
    )
  })
  it('shows zero responses without NaN percentages or a misleading chart', async () => {
    vi.mocked(resultsApi.get).mockResolvedValue({
      ...result,
      response_count: 0,
      questions: result.questions.map((q) => ({
        ...q,
        response_count: 0,
        choices: q.choices.map((c) => ({ ...c, count: 0, percentage: 0 })),
      })),
    })
    const view = mount()
    await screen.findByRole('heading', { name: 'No responses yet.' })
    expect(screen.getByText('0 answered · 0 unanswered')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getAllByText('0.0%')).toHaveLength(
      3,
    )
    expect(
      view.container.querySelector('svg.recharts-surface'),
    ).not.toBeInTheDocument()
  })
  it.each(['closed', 'archived'] as const)(
    'loads %s history without a presentation link',
    async (status) => {
      vi.mocked(surveyApi.summary).mockResolvedValue({ ...survey, status })
      mount()
      await screen.findByRole('table')
      expect(
        screen.getByText(
          `${status === 'closed' ? 'Closed' : 'Archived'} · 3 responses`,
        ),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('link', { name: 'Present QR' }),
      ).not.toBeInTheDocument()
    },
  )
  it('refreshes through the RPC and replaces the snapshot with updated counts', async () => {
    mount()
    await screen.findByRole('table')
    vi.mocked(resultsApi.get).mockResolvedValue({
      ...result,
      response_count: 4,
      questions: result.questions.map((q) => ({
        ...q,
        choices: q.choices.map((c) => ({ ...c, percentage: c.count * 25 })),
      })),
    })
    await userEvent.click(
      screen.getByRole('button', { name: 'Refresh results' }),
    )
    expect(await screen.findByText('Active · 4 responses')).toBeInTheDocument()
    expect(screen.getByText('3 answered · 1 unanswered')).toBeInTheDocument()
    expect(resultsApi.get).toHaveBeenCalledTimes(2)
  })
  it('explicitly labels retained results as stale after a network refresh failure', async () => {
    mount()
    await screen.findByRole('table')
    vi.mocked(resultsApi.get).mockRejectedValue(new Error('network'))
    await userEvent.click(
      screen.getByRole('button', { name: 'Refresh results' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'last successfully loaded results',
    )
    expect(screen.getByText('Active · 3 responses')).toBeInTheDocument()
  })
  it('hides prior results when the server revokes instructor access', async () => {
    mount()
    await screen.findByRole('table')
    vi.mocked(resultsApi.get).mockRejectedValue(
      new Error('INSTRUCTOR_REQUIRED'),
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Refresh results' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Instructor access is required',
    )
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
  it('retries an initial load error without inventing a zero-response result', async () => {
    vi.mocked(resultsApi.get).mockRejectedValueOnce(
      new Error('private database error'),
    )
    mount()
    await screen.findByRole('alert')
    expect(screen.queryByText('No responses yet.')).not.toBeInTheDocument()
    expect(screen.queryByText('private database error')).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Refresh results' }),
    )
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })
  it('handles a draft with no questions and no responses', async () => {
    vi.mocked(resultsApi.get).mockResolvedValue({
      ...result,
      response_count: 0,
      questions: [],
    })
    vi.mocked(surveyApi.summary).mockResolvedValue({
      ...survey,
      status: 'draft',
    })
    mount()
    expect(
      await screen.findByText('No questions in this survey.'),
    ).toBeInTheDocument()
  })
})
