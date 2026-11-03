import { Link } from 'react-router-dom'

export function SetupPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto max-w-xl px-6 py-20"
    >
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="my-6 text-slate-600">
        Check the address or return to the home page.
      </p>
      <Link className="font-semibold text-teal-800 underline" to="/">
        Back to home
      </Link>
    </main>
  )
}
