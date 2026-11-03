import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  resultsAccessDenied,
  resultsApi,
  type SurveyResults,
} from '../lib/results'
import { surveyApi, surveyError, type Survey } from '../lib/surveys'
import { QuestionResults } from '../components/QuestionResults'
import {
  createSurveyCsv,
  csvApi,
  csvError,
  downloadSurveyCsv,
} from '../lib/csvExport'

interface Snapshot {
  survey: Survey
  results: SurveyResults
  checkedAt: string
}
export function ResultsPage() {
  const { id } = useParams()
  return <Results key={id} id={id!} />
}
function Results({ id }: { id: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [exporting, setExporting] = useState(false)
  const exportLock = useRef(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportNotice, setExportNotice] = useState<string | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  async function exportCsv() {
    if (exportLock.current) return
    exportLock.current = true
    setExporting(true)
    setExportError(null)
    setExportNotice(null)
    try {
      const data = await csvApi.get(id)
      if (!mounted.current) return
      if (data.responses.length === 0) {
        setExportNotice(
          'There are no stored responses to export. Refresh results if the survey has changed.',
        )
        return
      }
      downloadSurveyCsv(id, createSurveyCsv(data))
      setExportNotice(
        `CSV download started for ${data.responses.length} ${data.responses.length === 1 ? 'response' : 'responses'}.`,
      )
    } catch (error) {
      if (mounted.current) {
        setExportError(csvError(error))
        if (resultsAccessDenied(error)) setSnapshot(null)
      }
    } finally {
      exportLock.current = false
      if (mounted.current) setExporting(false)
    }
  }
  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    void Promise.all([surveyApi.summary(id), resultsApi.get(id)])
      .then(([survey, results]) => {
        if (alive)
          setSnapshot({
            survey,
            results,
            checkedAt: new Date().toLocaleString(),
          })
      })
      .catch((error: unknown) => {
        if (!alive) return
        if (
          resultsAccessDenied(error) ||
          (error &&
            typeof error === 'object' &&
            'message' in error &&
            error.message === 'SURVEY_NOT_FOUND')
        )
          setSnapshot(null)
        setError(surveyError(error))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [id, revision])
  const statusLabels = {
    draft: 'Draft',
    active: 'Active',
    closed: 'Closed',
    archived: 'Archived',
  }
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto max-w-5xl px-5 py-10 sm:px-6"
      aria-busy={loading}
    >
      <Link className="text-teal-800 underline" to="/dashboard">
        Back to dashboard
      </Link>
      <header className="mt-7 flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="font-semibold text-teal-800">Survey results</p>
          <h1 className="mt-2 break-words text-3xl font-semibold">
            {snapshot?.survey.title ?? 'Results'}
          </h1>
          {snapshot && (
            <p className="mt-3 text-lg text-slate-600">
              {statusLabels[snapshot.survey.status]} ·{' '}
              {snapshot.results.response_count.toLocaleString()}{' '}
              {snapshot.results.response_count === 1 ? 'response' : 'responses'}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="button-secondary"
            disabled={loading || exporting}
            onClick={() => setRevision((value) => value + 1)}
          >
            {loading ? 'Loading results…' : 'Refresh results'}
          </button>
          <button
            className="button-secondary"
            disabled={
              loading ||
              exporting ||
              !snapshot ||
              Boolean(error) ||
              snapshot.results.response_count === 0
            }
            onClick={() => void exportCsv()}
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          {snapshot?.survey.status === 'active' && (
            <Link className="button-primary" to={`/surveys/${id}/present`}>
              Present QR
            </Link>
          )}
        </div>
      </header>
      {exportError && (
        <p className="mt-5 text-red-800" role="alert">
          {exportError}
        </p>
      )}
      {exportNotice && (
        <p className="mt-5 text-teal-900" role="status">
          {exportNotice}
        </p>
      )}
      {error && (
        <p className="mt-6 text-red-800" role="alert">
          {error}
          {snapshot
            ? ' Showing the last successfully loaded results; these may be out of date.'
            : ''}
        </p>
      )}
      {snapshot && (
        <>
          <p className="mt-5 text-sm text-slate-600">
            Last loaded: {snapshot.checkedAt}. Use Refresh results to include
            new responses. Percentages use all survey responses and may not sum
            to 100% because of rounding or unanswered questions. CSV export
            reads a fresh snapshot; refresh these charts to compare newly
            submitted responses.
          </p>
          {snapshot.results.response_count === 0 && (
            <section className="mt-7 rounded-xl border border-slate-300 bg-white p-6">
              <h2 className="text-xl font-semibold">No responses yet.</h2>
              <p className="mt-3 text-sm text-slate-600">
                CSV export becomes available after a response is recorded.
              </p>
              <p className="mt-3 text-slate-600">
                {snapshot.survey.status === 'active'
                  ? 'Display the QR code so students can join.'
                  : snapshot.survey.status === 'draft'
                    ? 'Activate this survey when you are ready to collect responses.'
                    : 'This survey has no stored responses.'}
              </p>
            </section>
          )}
          {snapshot.results.questions.length === 0 ? (
            <p className="mt-8 text-slate-600">No questions in this survey.</p>
          ) : (
            <div className="mt-8 space-y-7">
              {snapshot.results.questions.map((question, index) => (
                <QuestionResults
                  key={question.question_id}
                  question={question}
                  index={index}
                  total={snapshot.results.response_count}
                />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  )
}
