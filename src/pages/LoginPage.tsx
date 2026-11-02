import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { AuthStatusPanel } from '../components/AuthStatusPanel'

export function LoginPage() {
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (auth.status === 'authorized') return <Navigate to="/dashboard" replace />
  if (auth.status !== 'signed-out') return <AuthStatusPanel />
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    setError(await auth.signIn(email, password))
    setPassword('')
    setBusy(false)
  }
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <Link
        className="text-sm font-semibold tracking-widest text-teal-800"
        to="/"
      >
        CLASSROOM SURVEY
      </Link>
      <h1 className="mt-8 text-3xl font-semibold">Instructor login</h1>
      <p className="mt-3 text-slate-600">
        Sign in with your instructor account.
      </p>
      <form
        className="mt-8 space-y-5"
        onSubmit={(event) => void submit(event)}
        aria-busy={busy}
      >
        <div>
          <label className="mb-2 block font-medium" htmlFor="email">
            Email
          </label>
          <input
            className="field"
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
          />
        </div>
        <div>
          <label className="mb-2 block font-medium" htmlFor="password">
            Password
          </label>
          <input
            className="field"
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
          />
        </div>
        {error && (
          <p role="alert" className="text-red-800">
            {error}
          </p>
        )}
        <button className="button-primary w-full" disabled={busy} type="submit">
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </main>
  )
}
