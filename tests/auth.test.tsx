import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { AuthProvider } from '../src/auth/AuthProvider'
import { ProtectedRoute } from '../src/auth/ProtectedRoute'
import { LoginPage } from '../src/pages/LoginPage'
import { DashboardPage } from '../src/pages/DashboardPage'

vi.mock('../src/lib/surveys', () => ({
  surveyApi: { list: vi.fn().mockResolvedValue([]) },
  surveyError: () => 'Unable to load surveys.',
}))

const instructor = {
  access_token: 'fixture-token',
  user: { id: 'fixture-user', email: 'teacher@example.test' },
} as Session
function fixture(session: Session | null = null, allowed = true) {
  let listener: (_event: string, session: Session | null) => void = () => {}
  const unsubscribe = vi.fn()
  const getSession = vi
    .fn()
    .mockResolvedValue({ data: { session }, error: null })
  const rpc = vi.fn().mockImplementation(() => ({
    abortSignal: () => Promise.resolve({ data: allowed, error: null }),
  }))
  const signInWithPassword = vi.fn().mockImplementation(async () => {
    listener('SIGNED_IN', instructor)
    return { data: { session: instructor }, error: null }
  })
  const signOut = vi.fn().mockImplementation(async () => {
    listener('SIGNED_OUT', null)
    return { error: null }
  })
  const client = {
    rpc,
    auth: {
      getSession,
      signInWithPassword,
      signOut,
      onAuthStateChange: vi.fn((callback) => {
        listener = callback
        return { data: { subscription: { unsubscribe } } }
      }),
    },
  } as unknown as SupabaseClient
  return {
    client,
    getSession,
    rpc,
    signInWithPassword,
    signOut,
    unsubscribe,
    emit: (next: Session | null) =>
      listener(next ? 'SIGNED_IN' : 'SIGNED_OUT', next),
  }
}
function mount(f: ReturnType<typeof fixture>, path = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider client={f.client}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}
describe('instructor authentication', () => {
  it('redirects a signed-out deep link to login without checking instructor membership', async () => {
    const f = fixture()
    mount(f)
    expect(
      await screen.findByRole('heading', { name: 'Instructor login' }),
    ).toBeInTheDocument()
    expect(f.rpc).not.toHaveBeenCalled()
    expect(screen.queryByText('You’re signed in')).not.toBeInTheDocument()
  })
  it('restores a session and waits for authorization before displaying protected content', async () => {
    const f = fixture(instructor)
    let resolve!: (value: unknown) => void
    f.rpc.mockImplementation(() => ({
      abortSignal: () =>
        new Promise((done) => {
          resolve = done
        }),
    }))
    mount(f)
    await waitFor(() => expect(f.rpc).toHaveBeenCalledWith('is_instructor'))
    expect(screen.queryByText('You’re signed in')).not.toBeInTheDocument()
    await act(async () => {
      resolve({ data: true, error: null })
    })
    expect(
      await screen.findByText('Signed in as teacher@example.test'),
    ).toBeInTheDocument()
  })
  it('denies a signed-in non-instructor', async () => {
    mount(fixture(instructor, false))
    expect(
      await screen.findByRole('heading', {
        name: 'Instructor access required',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Instructor dashboard' }),
    ).not.toBeInTheDocument()
  })
  it('fails closed on an RPC/network error and can retry', async () => {
    const f = fixture(instructor)
    f.rpc.mockImplementationOnce(() => ({
      abortSignal: () => Promise.reject(new Error('fixture failure')),
    }))
    mount(f)
    expect(
      await screen.findByRole('heading', { name: 'Unable to verify access' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('You’re signed in')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(
      await screen.findByRole('heading', { name: 'Instructor dashboard' }),
    ).toBeInTheDocument()
  })
  it('logs in with trimmed email, checks authorization, then logs out locally', async () => {
    const f = fixture()
    mount(f, '/login')
    await userEvent.type(
      await screen.findByLabelText('Email'),
      'teacher@example.test',
    )
    await userEvent.type(
      screen.getByLabelText('Password'),
      'test-only-password',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(
      await screen.findByRole('heading', { name: 'Instructor dashboard' }),
    ).toBeInTheDocument()
    expect(f.signInWithPassword).toHaveBeenCalledWith({
      email: 'teacher@example.test',
      password: 'test-only-password',
    })
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(
      await screen.findByRole('heading', { name: 'Instructor login' }),
    ).toBeInTheDocument()
    expect(f.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
  it('shows friendly invalid-credential errors and clears the password', async () => {
    const f = fixture()
    f.signInWithPassword.mockResolvedValue({
      error: { status: 400, message: 'raw private error' },
    })
    mount(f)
    await userEvent.type(
      await screen.findByLabelText('Email'),
      'teacher@example.test',
    )
    await userEvent.type(screen.getByLabelText('Password'), 'incorrect')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Check your email and password',
    )
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.queryByText('raw private error')).not.toBeInTheDocument()
  })
  it('handles getSession failures without rendering the dashboard', async () => {
    const f = fixture()
    f.getSession.mockRejectedValue(new Error('fixture failure'))
    mount(f)
    expect(
      await screen.findByRole('heading', { name: 'Unable to verify access' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('You’re signed in')).not.toBeInTheDocument()
  })
  it('blocks protected content after sign-out/session expiration events', async () => {
    const f = fixture(instructor)
    mount(f)
    await screen.findByRole('heading', { name: 'Instructor dashboard' })
    act(() => f.emit(null))
    expect(
      await screen.findByRole('heading', { name: 'Instructor login' }),
    ).toBeInTheDocument()
  })
  it('ignores stale authorization completing after sign-out', async () => {
    const f = fixture(instructor)
    let resolve!: (value: unknown) => void
    f.rpc.mockImplementation(() => ({
      abortSignal: () =>
        new Promise((done) => {
          resolve = done
        }),
    }))
    mount(f)
    await waitFor(() => expect(f.rpc).toHaveBeenCalled())
    act(() => f.emit(null))
    await act(async () => {
      resolve({ data: true, error: null })
    })
    expect(
      await screen.findByRole('heading', { name: 'Instructor login' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('You’re signed in')).not.toBeInTheDocument()
  })
  it('does not let an older getSession overwrite a newer auth event', async () => {
    const f = fixture()
    let resolve!: (value: unknown) => void
    f.getSession.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    mount(f)
    act(() => f.emit(instructor))
    await screen.findByRole('heading', { name: 'Instructor dashboard' })
    await act(async () => {
      resolve({ data: { session: null }, error: null })
    })
    expect(
      screen.getByRole('heading', { name: 'Instructor dashboard' }),
    ).toBeInTheDocument()
  })
  it('retains the dashboard and reports a failed logout', async () => {
    const f = fixture(instructor)
    f.signOut.mockResolvedValue({ error: { message: 'fixture failure' } })
    mount(f)
    await screen.findByRole('heading', { name: 'Instructor dashboard' })
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to log out',
    )
    expect(
      screen.getByRole('heading', { name: 'Instructor dashboard' }),
    ).toBeInTheDocument()
  })
  it('unsubscribes the auth listener on unmount', () => {
    const f = fixture()
    const view = mount(f)
    view.unmount()
    expect(f.unsubscribe).toHaveBeenCalledOnce()
  })
})
