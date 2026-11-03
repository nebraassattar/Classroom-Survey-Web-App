import axe from 'axe-core'
import { render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '../src/auth/AuthContext'
import { LoginPage } from '../src/pages/LoginPage'
import { DashboardPage } from '../src/pages/DashboardPage'
import { SurveyDraftPage } from '../src/pages/SurveyDraftPage'
import { StudentSurveyPage } from '../src/pages/StudentSurveyPage'

vi.mock('../src/lib/surveys', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/surveys')>()
  return { ...actual, surveyApi: { list: vi.fn().mockResolvedValue([]) } }
})
vi.mock('../src/lib/student', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/student')>()
  return {
    ...actual,
    studentApi: {
      load: vi.fn().mockResolvedValue({
        state: 'active',
        survey: {
          id: 's',
          title: 'Class check',
          description: 'Answer these questions',
        },
        questions: [
          {
            id: 'q',
            question_text: 'Choose one',
            question_type: 'multiple_choice',
            position: 1,
            choices: [
              { id: 'a', choice_text: 'First', position: 1 },
              { id: 'b', choice_text: 'Second', position: 2 },
            ],
          },
        ],
      }),
    },
  }
})
const context: AuthContextValue = {
  status: 'signed-out',
  session: null,
  signIn: vi.fn(),
  signOut: vi.fn(),
  retry: vi.fn(),
}
beforeEach(() => localStorage.clear())
async function check(container: HTMLElement) {
  const result = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false } },
  })
  expect(
    result.violations.map(
      (v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).join(', '),
    ),
  ).toEqual([])
}
it('has no detected semantic accessibility violations on login', async () => {
  const { container } = render(
    <MemoryRouter>
      <AuthContext.Provider value={context}>
        <LoginPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  await check(container)
})
it('has no detected semantic accessibility violations on empty dashboard/filter controls', async () => {
  const { container } = render(
    <MemoryRouter>
      <AuthContext.Provider value={{ ...context, status: 'authorized' }}>
        <DashboardPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  await screen.findByText('You have not created any surveys yet.')
  await check(container)
})
it('has no detected semantic accessibility violations on the draft editor', async () => {
  const { container } = render(
    <MemoryRouter>
      <SurveyDraftPage />
    </MemoryRouter>,
  )
  await check(container)
})
it('has no detected semantic accessibility violations on anonymous questions', async () => {
  const { container } = render(
    <MemoryRouter>
      <StudentSurveyPage />
    </MemoryRouter>,
  )
  await screen.findByRole('heading', { name: 'Class check' })
  await check(container)
})
