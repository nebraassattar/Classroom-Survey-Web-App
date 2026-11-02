import { Link } from 'react-router-dom'

export function SetupPage({ notFound = false }: { notFound?: boolean }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-3xl font-semibold">
        {notFound ? 'Page not found' : 'Instructor login is coming next'}
      </h1>
      <p className="my-6 text-slate-600">
        {notFound
          ? 'Check the address or return to the home page.'
          : 'This phase provides the project foundation. No credentials are collected and no survey data is connected.'}
      </p>
      <Link className="font-semibold text-teal-800 underline" to="/">
        Back to home
      </Link>
    </main>
  )
}
