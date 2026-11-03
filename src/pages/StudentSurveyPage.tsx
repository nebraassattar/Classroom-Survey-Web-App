import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import {
  browserToken,
  hasSubmitted,
  markSubmitted,
  studentApi,
  studentError,
  studentErrorCode,
  type StudentSurvey,
} from '../lib/student'

export function StudentSurveyPage() {
  const { slug } = useParams()
  return <StudentForm key={slug} slug={slug!} />
}
function StudentForm({ slug }: { slug: string }) {
  const terminalHeading = useRef<HTMLHeadingElement>(null)
  const [survey, setSurvey] = useState<StudentSurvey | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [missing, setMissing] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<
    'success' | 'duplicate' | null
  >(null)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError(false)
    void studentApi
      .load(slug)
      .then((data) => {
        if (!active) return
        setSurvey(data)
        if (data.state === 'active' && hasSubmitted(data.survey.id))
          setConfirmation('duplicate')
      })
      .catch(() => {
        if (active) setLoadError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [slug, attempt])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (inFlight.current || survey?.state !== 'active') return
    const unanswered = survey.questions
      .filter(
        (question) =>
          !question.choices.some(
            (choice) => choice.id === answers[question.id],
          ),
      )
      .map((question) => question.id)
    setMissing(unanswered)
    setError(null)
    if (unanswered.length) {
      requestAnimationFrame(() =>
        document.getElementById(`question-${unanswered[0]}`)?.focus(),
      )
      return
    }
    inFlight.current = true
    setBusy(true)
    try {
      const token = browserToken()
      await studentApi.submit(
        survey.survey.id,
        token,
        survey.questions.map((question) => ({
          question_id: question.id,
          choice_id: answers[question.id],
        })),
      )
      markSubmitted(survey.survey.id)
      if (alive.current) setConfirmation('success')
    } catch (error) {
      const code = studentErrorCode(error)
      if (code === 'DUPLICATE_RESPONSE') markSubmitted(survey.survey.id)
      if (!alive.current) return
      if (code === 'DUPLICATE_RESPONSE') setConfirmation('duplicate')
      else if (code === 'SURVEY_NOT_ACTIVE') setSurvey({ state: 'closed' })
      else setError(studentError(error))
    } finally {
      inFlight.current = false
      if (alive.current) setBusy(false)
    }
  }
  const terminal =
    confirmation ||
    (survey?.state === 'closed'
      ? 'closed'
      : survey?.state === 'not_found'
        ? 'not_found'
        : null)
  useEffect(() => {
    if (!loading && !loadError && terminal) terminalHeading.current?.focus()
  }, [loading, loadError, terminal])
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto max-w-2xl px-5 py-10 sm:py-14"
    >
      {loading ? (
        <p role="status" className="text-lg">
          Loading survey…
        </p>
      ) : loadError ? (
        <section>
          <h1 className="text-3xl font-semibold">Unable to load survey</h1>
          <p role="alert" className="my-5 text-slate-600">
            Check your connection and try again. Your responses have not been
            submitted from this page.
          </p>
          <button
            className="button-primary"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Try again
          </button>
        </section>
      ) : terminal ? (
        <section aria-live="polite">
          <h1
            ref={terminalHeading}
            tabIndex={-1}
            className="text-3xl font-semibold"
          >
            {terminal === 'success'
              ? 'Thank you!'
              : terminal === 'duplicate'
                ? 'Already submitted'
                : terminal === 'closed'
                  ? 'Survey closed'
                  : 'Survey not found'}
          </h1>
          <p className="mt-5 text-lg text-slate-600">
            {terminal === 'success'
              ? 'Your response has been recorded.'
              : terminal === 'duplicate'
                ? 'You have already submitted a response to this survey.'
                : terminal === 'closed'
                  ? 'This survey is no longer accepting responses.'
                  : 'Check the URL or ask your instructor for the current survey link.'}
          </p>
        </section>
      ) : survey?.state === 'active' ? (
        <>
          <h1 className="break-words text-3xl font-semibold">
            {survey.survey.title}
          </h1>
          {survey.survey.description && (
            <p className="mt-4 break-words whitespace-pre-wrap text-lg text-slate-600">
              {survey.survey.description}
            </p>
          )}
          <p className="mt-5 text-sm text-slate-600">
            No login required. Answer every question, then submit once.
          </p>
          <form
            onSubmit={(event) => void submit(event)}
            noValidate
            className="mt-8 space-y-7"
            aria-busy={busy}
          >
            {missing.length > 0 && (
              <p role="alert" className="text-red-800">
                Please answer all {missing.length} remaining{' '}
                {missing.length === 1 ? 'question' : 'questions'}.
              </p>
            )}
            {survey.questions.map((question, index) => (
              <fieldset
                id={`question-${question.id}`}
                tabIndex={-1}
                key={question.id}
                disabled={busy}
                aria-invalid={missing.includes(question.id)}
                aria-describedby={
                  missing.includes(question.id)
                    ? `error-${question.id}`
                    : undefined
                }
                className="min-w-0 rounded-xl border border-slate-300 bg-white p-5"
              >
                <legend className="max-w-full break-words px-2 text-lg font-semibold">
                  {index + 1}. {question.question_text}{' '}
                  <span className="text-sm font-normal">(required)</span>
                </legend>
                <div className="mt-2 space-y-3">
                  {question.choices.map((choice) => (
                    <label
                      key={choice.id}
                      className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border p-4 ${answers[question.id] === choice.id ? 'border-teal-700 bg-teal-50' : 'border-slate-300 hover:bg-slate-50'}`}
                    >
                      <input
                        className="mt-1 h-5 w-5 shrink-0 accent-teal-800"
                        type="radio"
                        required
                        name={`answer-${question.id}`}
                        value={choice.id}
                        checked={answers[question.id] === choice.id}
                        onChange={() => {
                          setAnswers((current) => ({
                            ...current,
                            [question.id]: choice.id,
                          }))
                          setMissing((current) =>
                            current.filter((id) => id !== question.id),
                          )
                          setError(null)
                        }}
                      />
                      <span className="min-w-0 break-words">
                        {choice.choice_text}
                      </span>
                    </label>
                  ))}
                </div>
                {missing.includes(question.id) && (
                  <p id={`error-${question.id}`} className="mt-3 text-red-800">
                    Select an answer for this question.
                  </p>
                )}
              </fieldset>
            ))}
            {error && (
              <p role="alert" className="text-red-800">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="button-primary w-full"
              disabled={busy}
            >
              {busy ? 'Submitting…' : 'Submit response'}
            </button>
          </form>
        </>
      ) : null}
    </main>
  )
}
