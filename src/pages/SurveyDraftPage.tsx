import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { surveyApi, surveyError, type DraftContent } from '../lib/surveys'

export function SurveyDraftPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [content, setContent] = useState<DraftContent | undefined>()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(Boolean(id))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!id) return
    let alive = true
    void surveyApi
      .get(id)
      .then((data) => {
        if (!alive) return
        setContent(data)
        setTitle(data.title)
        setDescription(data.description ?? '')
        setLoading(false)
      })
      .catch((error: unknown) => {
        if (alive) {
          setError(surveyError(error))
          setLoading(false)
        }
      })
    return () => {
      alive = false
    }
  }, [id])
  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!title.trim()) {
      setError('Enter a survey title.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await surveyApi.save(id ?? null, title, description, content)
      navigate('/dashboard', { state: { notice: 'Draft saved.' } })
    } catch (error) {
      setError(surveyError(error))
      setBusy(false)
    }
  }
  const editable = !id || content?.status === 'draft'
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link className="text-teal-800 underline" to="/dashboard">
        Back to dashboard
      </Link>
      <h1 className="my-6 text-3xl font-semibold">
        {id ? 'Edit draft details' : 'New survey'}
      </h1>
      {loading ? (
        <p role="status">Loading survey…</p>
      ) : (
        <>
          {error && (
            <p className="mb-5 text-red-800" role="alert">
              {error}
            </p>
          )}
          {!editable ? (
            <p>
              This survey cannot be edited. Return to the dashboard and
              duplicate it to create a draft.
            </p>
          ) : (
            <form
              onSubmit={(event) => void save(event)}
              className="space-y-5"
              aria-busy={busy}
            >
              <div>
                <label htmlFor="title" className="mb-2 block font-medium">
                  Survey title
                </label>
                <input
                  id="title"
                  className="field"
                  maxLength={200}
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={busy}
                />
              </div>
              <div>
                <label htmlFor="description" className="mb-2 block font-medium">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  className="field min-h-32"
                  maxLength={4000}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={busy}
                />
              </div>
              <p className="text-sm text-slate-600">
                Question editing is not available yet. Existing questions are
                preserved when saving these details. A survey needs questions
                before it can be activated.
              </p>
              <button className="button-primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save draft'}
              </button>
            </form>
          )}
        </>
      )}
    </main>
  )
}
