import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../src/auth/AuthContext'
import { DashboardPage } from '../src/pages/DashboardPage'
import { SurveyDraftPage } from '../src/pages/SurveyDraftPage'
import { surveyApi, type Survey } from '../src/lib/surveys'

vi.mock('../src/lib/surveys', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/surveys')>()
  return {
    ...actual,
    surveyApi: {
      list: vi.fn(),
      get: vi.fn(),
      save: vi.fn(),
      mutate: vi.fn(),
      responseCount: vi.fn(),
    },
  }
})
const survey = (
  id: string,
  title: string,
  status: Survey['status'] = 'draft',
): Survey => ({
  id,
  title,
  status,
  description: null,
  public_slug: null,
  created_at: '2026-11-02T12:00:00Z',
  updated_at: '2026-11-02T12:00:00Z',
})
const items = [
  survey('draft-id', 'Recursion check'),
  survey('closed-id', 'Pointers', 'closed'),
  survey('active-id', 'Functions', 'active'),
]
function mount(path = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider
        value={{
          status: 'authorized',
          session: null,
          signIn: vi.fn(),
          signOut: vi.fn(),
          retry: vi.fn(),
        }}
      >
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/surveys/new" element={<SurveyDraftPage />} />
          <Route path="/surveys/:id/edit" element={<SurveyDraftPage />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}
beforeEach(() => {
  vi.mocked(surveyApi.list).mockReset().mockResolvedValue(items)
  vi.mocked(surveyApi.mutate).mockReset().mockResolvedValue(null)
  vi.mocked(surveyApi.responseCount).mockReset().mockResolvedValue(0)
  vi.mocked(surveyApi.save).mockReset().mockResolvedValue('new-id')
  vi.mocked(surveyApi.get)
    .mockReset()
    .mockResolvedValue({ ...items[0], questions: [] })
})
describe('survey dashboard', () => {
  it('loads real-service results and combines title search with status filtering', async () => {
    mount()
    await screen.findByRole('article', { name: 'Recursion check' })
    await userEvent.type(screen.getByLabelText('Search by title'), 'RECURSION')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'closed')
    expect(
      screen.getByText('No surveys match your search.'),
    ).toBeInTheDocument()
    await userEvent.clear(screen.getByLabelText('Search by title'))
    expect(
      screen.getByRole('article', { name: 'Pointers' }),
    ).toBeInTheDocument()
  })
  it('distinguishes an empty database from a loading failure and supports retry', async () => {
    vi.mocked(surveyApi.list)
      .mockRejectedValueOnce(new Error('private raw error'))
      .mockResolvedValueOnce([])
    mount()
    expect(await screen.findByRole('alert')).not.toHaveTextContent(
      'private raw error',
    )
    expect(
      screen.queryByText('You have not created any surveys yet.'),
    ).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Refresh surveys' }),
    )
    expect(
      await screen.findByText('You have not created any surveys yet.'),
    ).toBeInTheDocument()
  })
  it('cancels archive without a mutation and confirms before applying it', async () => {
    mount()
    const card = await screen.findByRole('article', { name: 'Recursion check' })
    await userEvent.click(within(card).getByRole('button', { name: 'Archive' }))
    let dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    )
    expect(surveyApi.mutate).not.toHaveBeenCalled()
    await userEvent.click(within(card).getByRole('button', { name: 'Archive' }))
    dialog = await screen.findByRole('dialog')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Archive survey' }),
    )
    expect(surveyApi.mutate).toHaveBeenCalledWith('archive', 'draft-id')
    expect(await screen.findByText('Survey archived.')).toBeInTheDocument()
  })
  it('shows a stronger response-deletion warning and does not delete on cancel', async () => {
    vi.mocked(surveyApi.responseCount).mockResolvedValue(12)
    mount()
    const card = await screen.findByRole('article', { name: 'Pointers' })
    await userEvent.click(within(card).getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('12 stored responses')
    expect(dialog).toHaveTextContent('Archive instead')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    )
    expect(surveyApi.mutate).not.toHaveBeenCalled()
  })
  it('refuses deletion if the response-count check fails', async () => {
    vi.mocked(surveyApi.responseCount).mockRejectedValue(new Error('network'))
    mount()
    await userEvent.click(
      within(
        await screen.findByRole('article', { name: 'Pointers' }),
      ).getByRole('button', { name: 'Delete' }),
    )
    await screen.findByRole('alert')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(surveyApi.mutate).not.toHaveBeenCalled()
  })
  it('keeps a failed activation dialog open with a friendly database validation error', async () => {
    vi.mocked(surveyApi.mutate).mockRejectedValue(
      new Error('SURVEY_HAS_NO_QUESTIONS'),
    )
    mount()
    await userEvent.click(
      within(
        await screen.findByRole('article', { name: 'Recursion check' }),
      ).getByRole('button', { name: 'Activate' }),
    )
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('closes any currently active survey')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Activate survey' }),
    )
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Add at least one question',
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
  it('only allows close on Active cards and withholds editing and deletion', async () => {
    mount()
    const card = await screen.findByRole('article', { name: 'Functions' })
    expect(
      within(card).getByRole('link', { name: 'Present QR' }),
    ).toHaveAttribute('href', '/surveys/active-id/present')
    expect(
      within(card).getByRole('button', { name: 'Close survey' }),
    ).toBeInTheDocument()
    expect(
      within(card).queryByRole('link', { name: 'Edit' }),
    ).not.toBeInTheDocument()
    expect(
      within(card).queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument()
    expect(
      within(card).queryByRole('button', { name: 'Archive' }),
    ).not.toBeInTheDocument()
  })
  it('duplicates via the RPC then opens the new draft', async () => {
    vi.mocked(surveyApi.mutate).mockResolvedValue('new-copy')
    mount()
    await userEvent.click(
      within(
        await screen.findByRole('article', { name: 'Pointers' }),
      ).getByRole('button', { name: 'Duplicate' }),
    )
    await screen.findByRole('heading', { name: 'Edit draft survey' })
    expect(surveyApi.mutate).toHaveBeenCalledWith('duplicate', 'closed-id')
    expect(surveyApi.get).toHaveBeenCalledWith('new-copy')
  })
  it('creates a metadata-only draft and returns to the refreshed dashboard', async () => {
    mount('/surveys/new')
    await userEvent.type(screen.getByLabelText('Survey title'), 'New draft')
    await userEvent.type(
      screen.getByLabelText('Description (optional)'),
      'Description',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(surveyApi.save).toHaveBeenCalledWith(
      null,
      'New draft',
      'Description',
      { questions: [] },
    )
    expect(await screen.findByText('Draft saved.')).toBeInTheDocument()
  })
  it('never renders an edit form for a historical survey', async () => {
    vi.mocked(surveyApi.get).mockResolvedValue({ ...items[1], questions: [] })
    mount('/surveys/closed-id/edit')
    expect(
      await screen.findByText(/This survey cannot be edited/),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Survey title')).not.toBeInTheDocument()
  })
  it('paginates the filtered list rather than hiding older survey matches', async () => {
    vi.mocked(surveyApi.list).mockResolvedValue(
      Array.from({ length: 13 }, (_, i) => survey(String(i), `Survey ${i}`)),
    )
    mount()
    await screen.findByRole('article', { name: 'Survey 0' })
    expect(screen.getAllByRole('article')).toHaveLength(12)
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(
      screen.getByRole('article', { name: 'Survey 12' }),
    ).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Search by title'), 'Survey 0')
    expect(
      screen.getByRole('article', { name: 'Survey 0' }),
    ).toBeInTheDocument()
  })
})
