import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LogoutButton } from '../components/LogoutButton'
import { ConfirmDialog } from '../components/ConfirmDialog'
import {
  surveyApi,
  surveyError,
  type Survey,
  type SurveyStatus,
} from '../lib/surveys'

const statusLabels: Record<SurveyStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  closed: 'Closed',
  archived: 'Archived',
}
const badgeClasses: Record<SurveyStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  active: 'bg-teal-100 text-teal-900',
  closed: 'bg-amber-100 text-amber-900',
  archived: 'bg-slate-200 text-slate-700',
}
type Action = 'activate' | 'close' | 'archive' | 'delete'
interface Confirmation {
  action: Action
  survey: Survey
  description: string
}

export function DashboardPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(
    (location.state as { notice?: string } | null)?.notice ?? null,
  )
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<SurveyStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    void surveyApi
      .list()
      .then((data) => {
        if (alive) setSurveys(data)
      })
      .catch((error: unknown) => {
        if (alive) setError(surveyError(error))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [revision])
  async function prepare(action: Action, survey: Survey) {
    if (busy) return
    setBusy(true)
    setError(null)
    setNotice(null)
    setDialogError(null)
    try {
      let description =
        action === 'activate'
          ? 'Activating this survey closes any currently active survey. Students can then submit to this survey.'
          : action === 'close'
            ? 'Students will no longer be able to submit. Existing responses will be preserved.'
            : 'This survey will be archived. Its questions and responses will be preserved.'
      if (action === 'delete') {
        const count = await surveyApi.responseCount(survey.id)
        description =
          count > 0
            ? `Warning: this survey has ${count} stored ${count === 1 ? 'response' : 'responses'}. Deleting permanently removes the survey, questions and ALL responses. This cannot be undone. Archive instead to preserve history.`
            : 'This permanently deletes the survey and all associated questions and responses. This cannot be undone. Consider archiving instead.'
      }
      setConfirmation({ action, survey, description })
    } catch (error) {
      setError(surveyError(error))
    } finally {
      setBusy(false)
    }
  }
  async function execute() {
    if (!confirmation || busy) return
    setBusy(true)
    setDialogError(null)
    try {
      await surveyApi.mutate(confirmation.action, confirmation.survey.id)
      const messages = {
        activate: 'Survey activated.',
        close: 'Survey closed.',
        archive: 'Survey archived.',
        delete: 'Survey deleted.',
      }
      setNotice(messages[confirmation.action])
      setConfirmation(null)
      setRevision((value) => value + 1)
    } catch (error) {
      setDialogError(surveyError(error))
    } finally {
      setBusy(false)
    }
  }
  async function duplicate(survey: Survey) {
    if (busy) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const id = await surveyApi.mutate('duplicate', survey.id)
      if (typeof id !== 'string')
        throw new Error('Unexpected duplicate response')
      navigate(`/surveys/${id}/edit`)
    } catch (error) {
      setError(surveyError(error))
      setBusy(false)
    }
  }
  const filtered = surveys.filter(
    (survey) =>
      (status === 'all' || survey.status === status) &&
      survey.title
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
  )
  const pages = Math.max(1, Math.ceil(filtered.length / 12))
  const currentPage = Math.min(page, pages)
  const visible = filtered.slice((currentPage - 1) * 12, currentPage * 12)
  const blocked = loading || busy || Boolean(error)
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="font-semibold text-teal-800">Classroom Survey</p>
          <h1 className="mt-2 text-3xl font-semibold">Instructor dashboard</h1>
          <p className="mt-3 break-all text-slate-600">
            Signed in as {session?.user.email ?? 'instructor'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="button-primary" to="/surveys/new">
            New survey
          </Link>
          <LogoutButton />
        </div>
      </header>
      <section
        className="mt-8 rounded-xl border border-slate-200 bg-white p-5"
        aria-label="Survey filters"
      >
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-0 flex-1 basis-64">
            <label htmlFor="search" className="mb-2 block font-medium">
              Search by title
            </label>
            <input
              id="search"
              type="search"
              className="field"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
          </div>
          <div>
            <label htmlFor="status" className="mb-2 block font-medium">
              Status
            </label>
            <select
              id="status"
              className="field"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as SurveyStatus | 'all')
                setPage(1)
              }}
            >
              <option value="all">All statuses</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            className="button-secondary"
            disabled={loading || busy}
            onClick={() => setRevision((value) => value + 1)}
          >
            {loading ? 'Loading…' : 'Refresh surveys'}
          </button>
        </div>
      </section>
      {notice && (
        <p className="mt-5 text-teal-900" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-5 text-red-800" role="alert">
          {error} Use Refresh surveys to reload.
        </p>
      )}
      {loading ? (
        <p className="mt-8" role="status">
          Loading surveys…
        </p>
      ) : surveys.length === 0 && !error ? (
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-8">
          <h2 className="text-xl font-semibold">
            You have not created any surveys yet.
          </h2>
          <Link
            className="mt-5 inline-block text-teal-800 underline"
            to="/surveys/new"
          >
            Create your first survey
          </Link>
        </section>
      ) : (
        <section className="mt-8" aria-label="Surveys">
          <p className="mb-4 text-sm text-slate-600" role="status">
            {filtered.length} {filtered.length === 1 ? 'survey' : 'surveys'}{' '}
            found
          </p>
          {filtered.length === 0 && <p>No surveys match your search.</p>}
          <div className="grid gap-5 md:grid-cols-2">
            {visible.map((survey) => (
              <article
                key={survey.id}
                className="min-w-0 rounded-xl border border-slate-200 bg-white p-6"
                aria-label={survey.title}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="break-words text-xl font-semibold">
                    {survey.title}
                  </h2>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${badgeClasses[survey.status]}`}
                  >
                    {statusLabels[survey.status]}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Created{' '}
                  <time dateTime={survey.created_at}>
                    {new Date(survey.created_at).toLocaleDateString()}
                  </time>
                </p>
                {survey.description && (
                  <p className="mt-3 break-words whitespace-pre-wrap text-slate-600">
                    {survey.description}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-2">
                  {survey.status === 'draft' && (
                    <Link
                      className="button-secondary"
                      to={`/surveys/${survey.id}/edit`}
                    >
                      Edit
                    </Link>
                  )}
                  <button
                    className="button-secondary"
                    disabled={blocked}
                    onClick={() => void duplicate(survey)}
                  >
                    Duplicate
                  </button>
                  {survey.status === 'draft' && (
                    <button
                      className="button-primary"
                      disabled={blocked}
                      onClick={() => void prepare('activate', survey)}
                    >
                      Activate
                    </button>
                  )}
                  {survey.status === 'active' && (
                    <Link
                      className="button-secondary"
                      to={`/surveys/${survey.id}/present`}
                    >
                      Present QR
                    </Link>
                  )}
                  {survey.status === 'active' && (
                    <button
                      className="button-secondary"
                      disabled={blocked}
                      onClick={() => void prepare('close', survey)}
                    >
                      Close survey
                    </button>
                  )}
                  {(survey.status === 'draft' ||
                    survey.status === 'closed') && (
                    <button
                      className="button-secondary"
                      disabled={blocked}
                      onClick={() => void prepare('archive', survey)}
                    >
                      Archive
                    </button>
                  )}
                  {survey.status !== 'active' && (
                    <button
                      className="button-secondary text-red-800"
                      disabled={blocked}
                      onClick={() => void prepare('delete', survey)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {pages > 1 && (
            <nav
              aria-label="Survey pages"
              className="mt-6 flex flex-wrap items-center gap-4"
            >
              <button
                className="button-secondary"
                disabled={currentPage === 1 || busy}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </button>
              <span>
                Page {currentPage} of {pages}
              </span>
              <button
                className="button-secondary"
                disabled={currentPage === pages || busy}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </section>
      )}
      <p className="mt-8 text-sm text-slate-600">
        Student response forms and results pages are not available yet.
      </p>
      {confirmation && (
        <ConfirmDialog
          title={`${{ activate: 'Activate', close: 'Close', archive: 'Archive', delete: 'Delete' }[confirmation.action]} “${confirmation.survey.title}”?`}
          description={confirmation.description}
          label={
            {
              activate: 'Activate survey',
              close: 'Close survey',
              archive: 'Archive survey',
              delete: 'Delete survey',
            }[confirmation.action]
          }
          busy={busy}
          error={dialogError}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => void execute()}
        />
      )}
    </main>
  )
}
