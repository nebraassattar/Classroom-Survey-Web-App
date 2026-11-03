import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { NavigationAccessibility } from '../src/components/NavigationAccessibility'
import { AppErrorBoundary } from '../src/components/AppErrorBoundary'

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})
it('updates page title and moves focus to the new heading on route navigation', async () => {
  render(
    <MemoryRouter>
      <NavigationAccessibility />
      <Routes>
        <Route
          path="/"
          element={
            <main id="main-content" tabIndex={-1}>
              <h1>Home</h1>
              <Link to="/dashboard">Open dashboard</Link>
            </main>
          }
        />
        <Route
          path="/dashboard"
          element={
            <main id="main-content" tabIndex={-1}>
              <h1>Dashboard</h1>
            </main>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
  expect(screen.getByRole('heading', { name: 'Home' })).toHaveFocus()
  await userEvent.click(screen.getByRole('link', { name: 'Open dashboard' }))
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toHaveFocus(),
  )
  expect(document.title).toBe('Instructor dashboard · Classroom Survey')
})
it('makes the skip link focus the page landmark without changing routes', async () => {
  render(
    <MemoryRouter>
      <NavigationAccessibility />
      <main id="main-content" tabIndex={-1}>
        <h1>Page</h1>
      </main>
    </MemoryRouter>,
  )
  await userEvent.click(screen.getByRole('link', { name: 'Skip to content' }))
  expect(screen.getByRole('main')).toHaveFocus()
})
it('catches a failed page render with useful recovery controls and no raw error text', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  function BrokenPage(): never {
    throw new Error('private fixture internals')
  }
  render(
    <AppErrorBoundary>
      <BrokenPage />
    </AppErrorBoundary>,
  )
  expect(
    screen.getByRole('heading', { name: 'Unable to display this page' }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Reload page' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute(
    'href',
    '/',
  )
  expect(
    screen.queryByText('private fixture internals'),
  ).not.toBeInTheDocument()
})
