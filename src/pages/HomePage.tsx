import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="mb-5 font-semibold tracking-widest text-teal-800">
        CLASSROOM SURVEY
      </p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
        A quick check.
        <br />A clearer classroom.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-slate-600">
        Quick in-class understanding checks. Prepare a survey, share a QR code,
        and see where your students stand.
      </p>
      <Link
        className="mt-8 w-fit rounded-lg bg-teal-800 px-6 py-3 font-semibold text-white hover:bg-teal-900"
        to="/login"
      >
        Instructor Login
      </Link>
      <p className="mt-10 border-t border-slate-300 pt-5 text-sm text-slate-600">
        Students join through the survey URL or QR code shared in class.
      </p>
    </main>
  )
}
