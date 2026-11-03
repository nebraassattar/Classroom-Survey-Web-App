import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { surveyApi, surveyError, type Survey } from '../lib/surveys'
import { createQrPng, isLocalHost, publicSurveyUrl } from '../lib/presentation'
import { ConfirmDialog } from '../components/ConfirmDialog'

export function PresentSurveyPage() {
  const { id } = useParams()
  return <Presentation key={id} id={id!} />
}
function Presentation({ id }: { id: string }) {
  const locallyClosed = useRef(false)
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countError, setCountError] = useState(false)
  const [updated, setUpdated] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [qr, setQr] = useState<{ url: string; png: string } | null>(null)
  const [qrError, setQrError] = useState<string | null>(null)
  const [qrAttempt, setQrAttempt] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [closing, setClosing] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    async function refresh() {
      setRefreshing(true)
      const [metadata, responses] = await Promise.allSettled([
        surveyApi.summary(id),
        surveyApi.responseCount(id),
      ])
      if (!alive) return
      if (metadata.status === 'fulfilled') {
        setSurvey(
          locallyClosed.current && metadata.value.status === 'active'
            ? { ...metadata.value, status: 'closed' }
            : metadata.value,
        )
        setError(null)
      } else {
        setError(surveyError(metadata.reason))
        setSurvey(null)
      }
      if (responses.status === 'fulfilled') {
        setCount(responses.value)
        setCountError(false)
        setUpdated(new Date().toLocaleTimeString())
      } else {
        setCount(null)
        setCountError(true)
        setUpdated(null)
      }
      setLoading(false)
      setRefreshing(false)
      if (
        metadata.status === 'fulfilled' &&
        metadata.value.status === 'active' &&
        !locallyClosed.current
      )
        timer = setTimeout(() => void refresh(), 10000)
    }
    void refresh()
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [id, revision])
  let url: string | null = null
  let urlError: string | null = null
  if (survey?.status === 'active') {
    try {
      url = publicSurveyUrl(survey.public_slug ?? '')
    } catch (error) {
      urlError =
        error instanceof Error
          ? error.message
          : 'Unable to create the public URL.'
    }
  }
  useEffect(() => {
    if (!url) return
    let alive = true
    setQrError(null)
    void createQrPng(url)
      .then((png) => {
        if (alive) setQr({ url, png })
      })
      .catch(() => {
        if (alive)
          setQrError(
            'Unable to generate the QR image. You can still use the survey link.',
          )
      })
    return () => {
      alive = false
    }
  }, [url, qrAttempt])
  async function close() {
    if (closing) return
    setClosing(true)
    setCloseError(null)
    try {
      await surveyApi.mutate('close', id)
      locallyClosed.current = true
      setSurvey((current) =>
        current ? { ...current, status: 'closed' } : current,
      )
      setConfirming(false)
      setRevision((value) => value + 1)
    } catch (error) {
      setCloseError(surveyError(error))
    } finally {
      setClosing(false)
    }
  }
  const active = survey?.status === 'active'
  const png = url && qr?.url === url && !qrError ? qr.png : null
  const local = url ? isLocalHost(new URL(url).hostname) : false
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto max-w-6xl px-6 py-8 text-center sm:py-12"
    >
      <Link className="inline-block text-teal-800 underline" to="/dashboard">
        Back to dashboard
      </Link>
      {loading ? (
        <p className="mt-12" role="status">
          Loading presentation…
        </p>
      ) : (
        <>
          {error && (
            <p role="alert" className="my-8 text-red-800">
              {error} Refresh to check the survey status before sharing.
            </p>
          )}
          {survey && (
            <>
              <h1 className="mt-8 break-words text-3xl font-semibold sm:text-5xl">
                {survey.title}
              </h1>
              {!active ? (
                <section className="my-10 rounded-xl border border-slate-300 bg-white p-8">
                  <h2 className="text-2xl font-semibold">
                    {survey.status === 'draft'
                      ? 'This survey is not active yet.'
                      : 'This survey is no longer accepting responses.'}
                  </h2>
                  <p className="mt-4 text-slate-600">
                    {survey.status === 'draft'
                      ? 'Add questions and activate it from the dashboard.'
                      : 'Existing responses remain stored. Duplicate the survey to run it again.'}
                  </p>
                </section>
              ) : (
                <>
                  {urlError && (
                    <p className="my-8 text-red-800" role="alert">
                      {urlError}
                    </p>
                  )}
                  {url && (
                    <>
                      {png ? (
                        <img
                          className="mx-auto mt-8 h-auto w-full max-w-[min(65vh,36rem)] bg-white"
                          src={png}
                          width={1024}
                          height={1024}
                          alt={`QR code linking to ${survey.title}. The same URL appears below.`}
                        />
                      ) : qrError ? (
                        <p className="my-8 text-red-800" role="alert">
                          {qrError}{' '}
                          <button
                            className="underline"
                            onClick={() => setQrAttempt((value) => value + 1)}
                          >
                            Retry QR generation
                          </button>
                        </p>
                      ) : (
                        <p className="my-8" role="status">
                          Generating QR code…
                        </p>
                      )}
                      <a
                        className="mt-6 block break-all text-xl font-semibold text-teal-900 underline sm:text-3xl"
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {url}
                      </a>
                      {local && (
                        <p className="mt-4 text-sm text-amber-900">
                          Local development URL. A phone cannot reach another
                          computer through localhost; configure a reachable
                          origin for classroom use.
                        </p>
                      )}
                    </>
                  )}
                </>
              )}
              <section className="mt-8" aria-label="Response count">
                <p className="text-3xl font-semibold sm:text-4xl">
                  Responses: {countError ? 'Unavailable' : (count ?? '—')}
                </p>
                {countError ? (
                  <p role="alert" className="mt-3 text-red-800">
                    Unable to refresh the response count. This is not a count of
                    zero.
                  </p>
                ) : (
                  updated && (
                    <p className="mt-3 text-sm text-slate-600">
                      Count checked at {updated}
                      {active ? '; refreshes every 10 seconds.' : '.'}
                    </p>
                  )
                )}
              </section>
            </>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {survey && (
              <Link className="button-secondary" to={`/surveys/${id}/results`}>
                View results
              </Link>
            )}
            <button
              className="button-secondary"
              disabled={refreshing || closing}
              onClick={() => setRevision((value) => value + 1)}
            >
              {refreshing ? 'Refreshing…' : 'Refresh presentation'}
            </button>
            {active && png && (
              <a
                className="button-secondary"
                href={png}
                download={`survey-${survey!.public_slug}-qr.png`}
              >
                Download QR PNG
              </a>
            )}
            {active && (
              <button
                className="button-primary"
                disabled={closing}
                onClick={() => {
                  setCloseError(null)
                  setConfirming(true)
                }}
              >
                Close survey
              </button>
            )}
          </div>
        </>
      )}
      {confirming && (
        <ConfirmDialog
          title={`Close “${survey?.title}”?`}
          description="Students will no longer be able to submit. Existing responses will be preserved."
          label="Close survey"
          busy={closing}
          error={closeError}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void close()}
        />
      )}
    </main>
  )
}
