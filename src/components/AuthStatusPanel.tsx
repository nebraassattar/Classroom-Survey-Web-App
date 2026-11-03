import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LogoutButton } from './LogoutButton'

export function AuthStatusPanel() {
  const { status, session, retry } = useAuth()
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto max-w-xl px-6 py-20"
      aria-busy={status === 'loading'}
    >
      <h1 className="text-3xl font-semibold">
        {status === 'loading'
          ? 'Checking instructor access…'
          : status === 'denied'
            ? 'Instructor access required'
            : 'Unable to verify access'}
      </h1>
      <p
        className="my-6 text-slate-600"
        role={status === 'loading' ? 'status' : 'alert'}
      >
        {status === 'loading'
          ? 'Please wait while we check your session.'
          : status === 'denied'
            ? 'This account is signed in but is not authorized as an instructor. Contact the project administrator.'
            : 'Check your connection and Supabase configuration, then try again.'}
      </p>
      {status === 'error' && (
        <button className="button-primary mb-4" onClick={retry}>
          Try again
        </button>
      )}
      {session && status !== 'loading' && <LogoutButton />}
      <Link className="mt-6 inline-block text-teal-800 underline" to="/">
        Back to home
      </Link>
    </main>
  )
}
