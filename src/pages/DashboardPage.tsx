import { useAuth } from '../auth/AuthContext'
import { LogoutButton } from '../components/LogoutButton'

export function DashboardPage() {
  const { session } = useAuth()
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="font-semibold text-teal-800">Classroom Survey</p>
          <h1 className="mt-2 text-3xl font-semibold">Instructor dashboard</h1>
          <p className="mt-3 break-all text-slate-600">
            Signed in as {session?.user.email ?? 'instructor'}
          </p>
        </div>
        <LogoutButton />
      </header>
      <section className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold">You’re signed in</h2>
        <p className="mt-3 text-slate-600">
          Your instructor access has been verified. Survey management will be
          added in the next phase.
        </p>
      </section>
    </main>
  )
}
