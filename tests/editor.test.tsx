import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { SurveyDraftPage } from '../src/pages/SurveyDraftPage'
import { surveyApi, type DraftContent } from '../src/lib/surveys'

vi.mock('../src/lib/surveys', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/surveys')>()
  return {
    ...actual,
    surveyApi: { get: vi.fn(), save: vi.fn(), mutate: vi.fn() },
  }
})
const content: DraftContent = {
  id: 'draft-id',
  title: 'Loaded survey',
  description: 'Description',
  status: 'draft',
  public_slug: null,
  created_at: '2026-11-02',
  updated_at: '2026-11-02',
  questions: [
    {
      question_text: 'Second loaded',
      question_type: 'true_false',
      position: 2,
      choices: [
        { choice_text: 'False', position: 2 },
        { choice_text: 'True', position: 1 },
      ],
    },
    {
      question_text: 'First loaded',
      question_type: 'multiple_choice',
      position: 1,
      choices: [
        { choice_text: 'B', position: 2 },
        { choice_text: 'A', position: 1 },
      ],
    },
  ],
}
function mount(path = '/surveys/new') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/surveys/new" element={<SurveyDraftPage />} />
        <Route path="/surveys/:id/edit" element={<SurveyDraftPage />} />
        <Route path="/dashboard" element={<p>Dashboard destination</p>} />
      </Routes>
    </MemoryRouter>,
  )
}
beforeEach(() => {
  vi.mocked(surveyApi.get)
    .mockReset()
    .mockResolvedValue(structuredClone(content))
  vi.mocked(surveyApi.save).mockReset().mockResolvedValue('saved-id')
  vi.mocked(surveyApi.mutate).mockReset().mockResolvedValue(null)
})
async function addCompleteQuestion() {
  await userEvent.click(screen.getByRole('button', { name: 'Add question' }))
  await userEvent.type(screen.getByLabelText('Question 1 text'), 'Question one')
  await userEvent.type(screen.getByLabelText('Question 1, choice 1'), 'Alpha')
  await userEvent.type(screen.getByLabelText('Question 1, choice 2'), 'Beta')
}
describe('draft question editor', () => {
  it('shows local field validation and prevents partial saves', async () => {
    mount()
    await userEvent.type(screen.getByLabelText('Survey title'), 'Valid title')
    await userEvent.click(screen.getByRole('button', { name: 'Add question' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(screen.getByLabelText('Question 1 text')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByLabelText('Question 1, choice 1')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(surveyApi.save).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(screen.getByLabelText('Question 1 text')).toHaveFocus(),
    )
  })
  it('keeps typed question and choice content while reordering, and saves contiguous positions', async () => {
    mount()
    await userEvent.type(screen.getByLabelText('Survey title'), 'Ordering')
    await addCompleteQuestion()
    await userEvent.click(screen.getByRole('button', { name: 'Add question' }))
    await userEvent.type(
      screen.getByLabelText('Question 2 text'),
      'Question two',
    )
    await userEvent.selectOptions(
      screen.getByLabelText('Question 2 type'),
      'true_false',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Move question 1 choice 1 down' }),
    )
    expect(screen.getByLabelText('Question 1, choice 1')).toHaveValue('Beta')
    await userEvent.click(
      screen.getByRole('button', { name: 'Move question 2 up' }),
    )
    expect(screen.getByLabelText('Question 1 text')).toHaveValue('Question two')
    expect(screen.getByLabelText('Question 2 text')).toHaveValue('Question one')
    expect(screen.getByLabelText('Question 2, choice 1')).toHaveValue('Beta')
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(surveyApi.save).toHaveBeenCalledWith(null, 'Ordering', '', {
      questions: [
        {
          question_text: 'Question two',
          question_type: 'true_false',
          position: 1,
          choices: [
            { choice_text: 'True', position: 1 },
            { choice_text: 'False', position: 2 },
          ],
        },
        {
          question_text: 'Question one',
          question_type: 'multiple_choice',
          position: 2,
          choices: [
            { choice_text: 'Beta', position: 1 },
            { choice_text: 'Alpha', position: 2 },
          ],
        },
      ],
    })
    expect(await screen.findByText('Dashboard destination')).toBeInTheDocument()
  })
  it('requires confirmation before replacing typed choices for a type change', async () => {
    mount()
    await addCompleteQuestion()
    await userEvent.selectOptions(
      screen.getByLabelText('Question 1 type'),
      'true_false',
    )
    let dialog = await screen.findByRole('dialog')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    )
    expect(screen.getByLabelText('Question 1, choice 1')).toHaveValue('Alpha')
    await userEvent.selectOptions(
      screen.getByLabelText('Question 1 type'),
      'true_false',
    )
    dialog = await screen.findByRole('dialog')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Replace choices' }),
    )
    expect(
      screen.getByText('Fixed choices: True and False.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Question 1, choice 1'),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Question 1 text')).toHaveValue('Question one')
  })
  it('confirms question deletion and keeps edits when cancelled', async () => {
    mount()
    await addCompleteQuestion()
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete question 1' }),
    )
    let dialog = await screen.findByRole('dialog')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    )
    expect(screen.getByLabelText('Question 1 text')).toHaveValue('Question one')
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete question 1' }),
    )
    dialog = await screen.findByRole('dialog')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Delete question' }),
    )
    expect(screen.queryByLabelText('Question 1 text')).not.toBeInTheDocument()
  })
  it('requires at least two choices and confirms removing an added choice', async () => {
    mount()
    await addCompleteQuestion()
    expect(
      screen.getByRole('button', { name: 'Delete question 1 choice 1' }),
    ).toBeDisabled()
    await userEvent.click(
      screen.getByRole('button', { name: 'Add choice to question 1' }),
    )
    await userEvent.type(screen.getByLabelText('Question 1, choice 3'), 'Gamma')
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete question 1 choice 3' }),
    )
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Delete choice',
      }),
    )
    expect(
      screen.queryByLabelText('Question 1, choice 3'),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Question 1, choice 1')).toHaveValue('Alpha')
  })
  it('loads and sorts existing questions/choices for editing', async () => {
    mount('/surveys/draft-id/edit')
    expect(await screen.findByLabelText('Question 1 text')).toHaveValue(
      'First loaded',
    )
    expect(screen.getByLabelText('Question 1, choice 1')).toHaveValue('A')
    expect(screen.getByLabelText('Question 2 text')).toHaveValue(
      'Second loaded',
    )
    expect(
      screen.getByText('Fixed choices: True and False.'),
    ).toBeInTheDocument()
  })
  it('preserves the form after a failed save for retry', async () => {
    vi.mocked(surveyApi.save).mockRejectedValueOnce(new Error('network'))
    mount()
    await userEvent.type(
      screen.getByLabelText('Survey title'),
      'Keep this title',
    )
    await addCompleteQuestion()
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    await screen.findByRole('alert')
    expect(screen.getByLabelText('Question 1 text')).toHaveValue('Question one')
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(await screen.findByText('Dashboard destination')).toBeInTheDocument()
  })
  it('cannot activate an empty draft and never sends a mutation', async () => {
    mount()
    await userEvent.type(screen.getByLabelText('Survey title'), 'Empty')
    await userEvent.click(
      screen.getByRole('button', { name: 'Save and activate' }),
    )
    expect(
      screen.getByText('Add at least one question before activating.'),
    ).toBeInTheDocument()
    expect(surveyApi.save).not.toHaveBeenCalled()
    expect(surveyApi.mutate).not.toHaveBeenCalled()
  })
  it('reuses the saved survey after activation fails, instead of creating another new draft', async () => {
    vi.mocked(surveyApi.mutate)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(null)
    mount()
    await userEvent.type(screen.getByLabelText('Survey title'), 'Activate')
    await addCompleteQuestion()
    await userEvent.click(
      screen.getByRole('button', { name: 'Save and activate' }),
    )
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Save and activate',
      }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Draft saved, but activation failed.',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Save and activate' }),
    )
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Save and activate',
      }),
    )
    expect(await screen.findByText('Dashboard destination')).toBeInTheDocument()
    expect(vi.mocked(surveyApi.save).mock.calls.map((call) => call[0])).toEqual(
      [null, 'saved-id'],
    )
    expect(surveyApi.mutate).toHaveBeenCalledWith('activate', 'saved-id')
  })
  it('asks before discarding unsaved edits via the dashboard link', async () => {
    mount()
    await userEvent.type(screen.getByLabelText('Survey title'), 'Unsaved')
    await userEvent.click(
      screen.getByRole('link', { name: 'Back to dashboard' }),
    )
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Unsaved changes')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Leave editor' }),
    )
    expect(await screen.findByText('Dashboard destination')).toBeInTheDocument()
  })
  it('never permits content editing in a closed survey', async () => {
    vi.mocked(surveyApi.get).mockResolvedValue({ ...content, status: 'closed' })
    mount('/surveys/draft-id/edit')
    await screen.findByText(/This survey cannot be edited/)
    expect(
      screen.queryByRole('button', { name: 'Add question' }),
    ).not.toBeInTheDocument()
  })
  it('handles load errors with an explicit retry rather than an editable empty form', async () => {
    vi.mocked(surveyApi.get).mockRejectedValueOnce(new Error('network'))
    mount('/surveys/draft-id/edit')
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByLabelText('Survey title')).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Retry loading survey' }),
    )
    expect(await screen.findByLabelText('Question 1 text')).toHaveValue(
      'First loaded',
    )
  })
})
