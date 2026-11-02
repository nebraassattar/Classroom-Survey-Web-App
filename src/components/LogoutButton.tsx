import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

export function LogoutButton() {
  const { signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function logout() {
    setBusy(true)
    setError(null)
    setError(await signOut())
    setBusy(false)
  }
  return (
    <div>
      <button
        className="button-secondary"
        onClick={() => void logout()}
        disabled={busy}
      >
        {busy ? 'Logging out…' : 'Log out'}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-red-800">
          {error}
        </p>
      )}
    </div>
  )
}
