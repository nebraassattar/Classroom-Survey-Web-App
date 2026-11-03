import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PresentSurveyPage } from '../src/pages/PresentSurveyPage'
import { surveyApi, type Survey } from '../src/lib/surveys'
import { createQrPng } from '../src/lib/presentation'

vi.mock('../src/lib/surveys', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/surveys')>()
  return {
    ...actual,
    surveyApi: { summary: vi.fn(), responseCount: vi.fn(), mutate: vi.fn() },
  }
})
vi.mock('../src/lib/presentation', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/lib/presentation')>()
  return { ...actual, createQrPng: vi.fn() }
})
const active: Survey = {
  id: 'survey-id',
  title: 'Recursion check',
  description: null,
  status: 'active',
  public_slug: 'public-slug',
  created_at: '2026-11-02',
  updated_at: '2026-11-02',
}
const png = 'data:image/png;base64,cG5nLWZpeHR1cmU='
function mount() {
  return render(
    <MemoryRouter initialEntries={['/surveys/survey-id/present']}>
      <Routes>
        <Route path="/surveys/:id/present" element={<PresentSurveyPage />} />
      </Routes>
    </MemoryRouter>,
  )
}
beforeEach(() => {
  vi.stubEnv('VITE_PUBLIC_APP_URL', 'https://classroom.example')
  vi.mocked(surveyApi.summary)
    .mockReset()
    .mockResolvedValue({ ...active })
  vi.mocked(surveyApi.responseCount).mockReset().mockResolvedValue(7)
  vi.mocked(surveyApi.mutate).mockReset().mockResolvedValue(null)
  vi.mocked(createQrPng).mockReset().mockResolvedValue(png)
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})
describe('classroom presentation', () => {
  it('does not generate a QR if an active survey is missing its public slug', async () => {
    vi.mocked(surveyApi.summary).mockResolvedValue({
      ...active,
      public_slug: null,
    })
    mount()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'no public identifier',
    )
    expect(createQrPng).not.toHaveBeenCalled()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
  it('renders the exact public URL, database count, QR and downloadable PNG', async () => {
    mount()
    const qr = await screen.findByRole('img')
    expect(qr).toHaveAttribute('src', png)
    expect(
      screen.getByRole('heading', { name: 'Recursion check' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Responses: 7')).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: 'https://classroom.example/s/public-slug',
      }),
    ).toHaveAttribute('href', 'https://classroom.example/s/public-slug')
    expect(createQrPng).toHaveBeenCalledWith(
      'https://classroom.example/s/public-slug',
    )
    const download = screen.getByRole('link', { name: 'Download QR PNG' })
    expect(download).toHaveAttribute('href', png)
    expect(download).toHaveAttribute('download', 'survey-public-slug-qr.png')
  })
  it('does not show a shareable QR for inactive or closed surveys', async () => {
    vi.mocked(surveyApi.summary).mockResolvedValue({
      ...active,
      status: 'closed',
    })
    mount()
    await screen.findByRole('heading', {
      name: 'This survey is no longer accepting responses.',
    })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Download QR PNG' }),
    ).not.toBeInTheDocument()
    expect(createQrPng).not.toHaveBeenCalled()
  })
  it('hides stale QR data if refreshing status fails', async () => {
    mount()
    await screen.findByRole('img')
    vi.mocked(surveyApi.summary).mockRejectedValueOnce(new Error('network'))
    await userEvent.click(
      screen.getByRole('button', { name: 'Refresh presentation' }),
    )
    await screen.findByRole('alert')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
  it('shows an unavailable count rather than a misleading zero while preserving valid QR', async () => {
    vi.mocked(surveyApi.responseCount).mockRejectedValue(new Error('network'))
    mount()
    await screen.findByRole('img')
    expect(screen.getByText('Responses: Unavailable')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('not a count of zero')
  })
  it('keeps the URL usable if QR rendering fails and supports retry', async () => {
    vi.mocked(createQrPng).mockRejectedValueOnce(new Error('canvas'))
    mount()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to generate the QR image',
    )
    expect(
      screen.getByRole('link', {
        name: 'https://classroom.example/s/public-slug',
      }),
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Retry QR generation' }),
    )
    expect(await screen.findByRole('img')).toBeInTheDocument()
  })
  it('confirms closing, then removes QR even if an older active snapshot arrives', async () => {
    mount()
    await screen.findByRole('img')
    await userEvent.click(screen.getByRole('button', { name: 'Close survey' }))
    let dialog = await screen.findByRole('dialog')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    )
    expect(surveyApi.mutate).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Close survey' }))
    dialog = await screen.findByRole('dialog')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Close survey' }),
    )
    expect(surveyApi.mutate).toHaveBeenCalledWith('close', 'survey-id')
    expect(
      await screen.findByRole('heading', {
        name: 'This survey is no longer accepting responses.',
      }),
    ).toBeInTheDocument()
    await waitFor(() => expect(surveyApi.summary).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
  it('preserves the active presentation and reports failed closing inside the dialog', async () => {
    vi.mocked(surveyApi.mutate).mockRejectedValue(new Error('network'))
    mount()
    await screen.findByRole('img')
    await userEvent.click(screen.getByRole('button', { name: 'Close survey' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Close survey' }),
    )
    expect(await within(dialog).findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('img')).toBeInTheDocument()
  })
  it('refreshes count and status after ten seconds and hides QR when closed elsewhere', async () => {
    mount()
    await screen.findByRole('img')
    vi.useFakeTimers()
    // Restart the poll with a manual refresh so its timer is controlled here.
    await act(async () => {
      screen.getByRole('button', { name: 'Refresh presentation' }).click()
    })
    vi.mocked(surveyApi.summary).mockResolvedValue({
      ...active,
      status: 'closed',
    })
    vi.mocked(surveyApi.responseCount).mockResolvedValue(9)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })
    expect(screen.getByText('Responses: 9')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'This survey is no longer accepting responses.',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
