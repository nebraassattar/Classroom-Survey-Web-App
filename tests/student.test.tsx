import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { StudentSurveyPage } from '../src/pages/StudentSurveyPage'
import { studentApi, type StudentSurvey } from '../src/lib/student'

vi.mock('../src/lib/student', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/student')>()
  return { ...actual, studentApi: { load: vi.fn(), submit: vi.fn() } }
})
const survey: StudentSurvey = {
  state: 'active',
  survey: {
    id: 'survey-id',
    title: 'Recursion check',
    description: 'A quick check',
  },
  questions: [
    {
      id: 'q1',
      question_text: 'Select a base case',
      question_type: 'multiple_choice',
      position: 1,
      choices: [
        { id: 'c1', choice_text: 'Stop at zero', position: 1 },
        { id: 'c2', choice_text: 'Repeat forever', position: 2 },
      ],
    },
    {
      id: 'q2',
      question_text: 'Recursion needs a stopping condition',
      question_type: 'true_false',
      position: 2,
      choices: [
        { id: 'c3', choice_text: 'True', position: 1 },
        { id: 'c4', choice_text: 'False', position: 2 },
      ],
    },
  ],
}
function mount(slug = 'slug') {
  return render(
    <MemoryRouter initialEntries={[`/s/${slug}`]}>
      <Routes>
        <Route path="/s/:slug" element={<StudentSurveyPage />} />
      </Routes>
    </MemoryRouter>,
  )
}
beforeEach(() => {
  localStorage.clear()
  vi.mocked(studentApi.load)
    .mockReset()
    .mockResolvedValue(structuredClone(survey))
  vi.mocked(studentApi.submit).mockReset().mockResolvedValue(undefined)
})
async function answerAll() {
  await userEvent.click(
    await screen.findByRole('radio', { name: 'Stop at zero' }),
  )
  await userEvent.click(screen.getByRole('radio', { name: 'True' }))
}
describe('anonymous student survey', () => {
  it('still confirms a committed response if the optional local success marker cannot be written', async () => {
    localStorage.setItem(
      'classroom-survey:browser-token',
      'b772bdc6-18cd-48aa-8055-4c1d2f158d81',
    )
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    mount()
    await answerAll()
    await userEvent.click(
      screen.getByRole('button', { name: 'Submit response' }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Thank you!' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
  it('renders the survey with radio groups and no instructor login or navigation', async () => {
    mount()
    expect(
      await screen.findByRole('heading', { name: 'Recursion check' }),
    ).toBeInTheDocument()
    expect(screen.getByText('A quick check')).toBeInTheDocument()
    expect(screen.getAllByRole('group')).toHaveLength(2)
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
  })
  it('validates every answer and focuses the first missing question without calling the server', async () => {
    mount()
    await screen.findByRole('heading', { name: 'Recursion check' })
    await userEvent.click(
      screen.getByRole('button', { name: 'Submit response' }),
    )
    expect(screen.getByRole('alert')).toHaveTextContent('2 remaining questions')
    expect(studentApi.submit).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getAllByRole('group')[0]).toHaveFocus())
    await userEvent.click(screen.getByRole('radio', { name: 'Stop at zero' }))
    expect(screen.getAllByRole('group')[0]).toHaveAttribute(
      'aria-invalid',
      'false',
    )
  })
  it('submits one complete payload with a persisted token, then shows confirmation after remount', async () => {
    const view = mount()
    await answerAll()
    await userEvent.click(
      screen.getByRole('button', { name: 'Submit response' }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Thank you!' }),
    ).toBeInTheDocument()
    const token = localStorage.getItem('classroom-survey:browser-token')
    expect(token).toMatch(/^[0-9a-f-]{36}$/)
    expect(studentApi.submit).toHaveBeenCalledWith('survey-id', token, [
      { question_id: 'q1', choice_id: 'c1' },
      { question_id: 'q2', choice_id: 'c3' },
    ])
    view.unmount()
    mount()
    expect(
      await screen.findByRole('heading', { name: 'Already submitted' }),
    ).toBeInTheDocument()
    expect(studentApi.submit).toHaveBeenCalledTimes(1)
  })
  it('prevents repeat events during a pending submission', async () => {
    let resolve!: () => void
    vi.mocked(studentApi.submit).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    mount()
    await answerAll()
    const form = screen
      .getByRole('button', { name: 'Submit response' })
      .closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(studentApi.submit).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Submitting…' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'True' })).toBeDisabled()
    await act(async () => resolve())
    expect(
      await screen.findByText('Your response has been recorded.'),
    ).toBeInTheDocument()
  })
  it('preserves answers and the same token after an uncertain network failure', async () => {
    vi.mocked(studentApi.submit).mockRejectedValueOnce(
      new Error('private transport detail'),
    )
    mount()
    await answerAll()
    await userEvent.click(
      screen.getByRole('button', { name: 'Submit response' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'could not confirm',
    )
    expect(screen.getByRole('radio', { name: 'True' })).toBeChecked()
    expect(
      screen.queryByText('private transport detail'),
    ).not.toBeInTheDocument()
    const token = vi.mocked(studentApi.submit).mock.calls[0][1]
    await userEvent.click(
      screen.getByRole('button', { name: 'Submit response' }),
    )
    await screen.findByRole('heading', { name: 'Thank you!' })
    expect(vi.mocked(studentApi.submit).mock.calls[1][1]).toBe(token)
  })
  it('handles server duplicate protection after a prior attempt was already stored', async () => {
    vi.mocked(studentApi.submit).mockRejectedValue(
      new Error('DUPLICATE_RESPONSE'),
    )
    mount()
    await answerAll()
    await userEvent.click(
      screen.getByRole('button', { name: 'Submit response' }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Already submitted' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Submit response' }),
    ).not.toBeInTheDocument()
  })
  it('handles closure between loading and submitting without a false success', async () => {
    vi.mocked(studentApi.submit).mockRejectedValue(
      new Error('SURVEY_NOT_ACTIVE'),
    )
    mount()
    await answerAll()
    await userEvent.click(
      screen.getByRole('button', { name: 'Submit response' }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Survey closed' }),
    ).toBeInTheDocument()
    expect(
      localStorage.getItem('classroom-survey:submitted:survey-id'),
    ).toBeNull()
  })
  it.each([
    ['closed', 'Survey closed'],
    ['not_found', 'Survey not found'],
  ] as const)(
    'renders the %s terminal state without a submission form',
    async (state, heading) => {
      vi.mocked(studentApi.load).mockResolvedValue({ state })
      mount()
      await screen.findByRole('heading', { name: heading })
      expect(screen.queryByRole('radio')).not.toBeInTheDocument()
      expect(studentApi.submit).not.toHaveBeenCalled()
    },
  )
  it('retries a failed load', async () => {
    vi.mocked(studentApi.load).mockRejectedValueOnce(new Error('network'))
    mount()
    await screen.findByRole('heading', { name: 'Unable to load survey' })
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(
      await screen.findByRole('radio', { name: 'True' }),
    ).toBeInTheDocument()
  })
  it('does not send a response if browser storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    mount()
    await answerAll()
    await userEvent.click(
      screen.getByRole('button', { name: 'Submit response' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Browser storage is unavailable',
    )
    expect(studentApi.submit).not.toHaveBeenCalled()
    expect(screen.getByRole('radio', { name: 'True' })).toBeChecked()
  })
})
