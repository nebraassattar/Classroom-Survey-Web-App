import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useBeforeUnload, useNavigate, useParams } from 'react-router-dom'
import { surveyApi, surveyError } from '../lib/surveys'
import {
  loadQuestions,
  moveItem,
  newChoice,
  newQuestion,
  serializeQuestions,
  validateDraft,
  type EditorQuestion,
} from '../lib/draftEditor'
import { QuestionEditor } from '../components/QuestionEditor'
import { ConfirmDialog } from '../components/ConfirmDialog'

type Confirmation =
  | { kind: 'question'; key: string }
  | { kind: 'choice'; key: string; choice: string }
  | { kind: 'type'; key: string; type: EditorQuestion['type'] }
  | { kind: 'activate' }
  | { kind: 'leave' }

export function SurveyDraftPage() {
  const { id } = useParams()
  return <DraftEditor key={id ?? 'new'} id={id} />
}
function DraftEditor({ id }: { id?: string }) {
  const navigate = useNavigate()
  const savedId = useRef<string | null>(id ?? null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<EditorQuestion[]>([])
  const [loading, setLoading] = useState(Boolean(id))
  const [loaded, setLoaded] = useState(!id)
  const [editable, setEditable] = useState(!id)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [announcement, setAnnouncement] = useState('')
  useBeforeUnload((event) => {
    if (dirty) {
      event.preventDefault()
      event.returnValue = ''
    }
  })
  useEffect(() => {
    if (!id) return
    let alive = true
    setLoading(true)
    setError(null)
    void surveyApi
      .get(id)
      .then((data) => {
        if (!alive) return
        setTitle(data.title)
        setDescription(data.description ?? '')
        setQuestions(loadQuestions(data))
        setEditable(data.status === 'draft')
        setLoaded(true)
        setDirty(false)
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
  }, [id, attempt])
  function changed() {
    setDirty(true)
    setErrors({})
    setError(null)
  }
  function updateQuestion(
    key: string,
    change: (question: EditorQuestion) => EditorQuestion,
  ) {
    changed()
    setQuestions((current) =>
      current.map((q) => (q.key === key ? change(q) : q)),
    )
  }
  function validate(activating = false) {
    const next = validateDraft(title, description, questions, activating)
    setErrors(next)
    setError(null)
    if (Object.keys(next).length) {
      requestAnimationFrame(() =>
        document.getElementById(Object.keys(next)[0])?.focus(),
      )
      return false
    }
    return true
  }
  async function persist(activate = false) {
    if (busy || !validate(activate)) return
    setBusy(true)
    setError(null)
    let saved = false
    try {
      savedId.current = await surveyApi.save(
        savedId.current,
        title,
        description,
        { questions: serializeQuestions(questions) },
      )
      saved = true
      setDirty(false)
      if (activate) await surveyApi.mutate('activate', savedId.current)
      navigate('/dashboard', {
        state: {
          notice: activate ? 'Survey saved and activated.' : 'Draft saved.',
        },
      })
    } catch (error) {
      setError(
        `${saved && activate ? 'Draft saved, but activation failed. ' : ''}${surveyError(error)}`,
      )
      setConfirmation(null)
      setBusy(false)
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    void persist()
  }
  function changeType(key: string, type: EditorQuestion['type']) {
    const q = questions.find((q) => q.key === key)
    if (!q || q.type === type) return
    if (q.choices.some((choice) => choice.text.trim())) {
      setConfirmation({ kind: 'type', key, type })
      return
    }
    updateQuestion(key, (q) => ({
      ...q,
      type,
      choices:
        type === 'true_false'
          ? [newChoice('True'), newChoice('False')]
          : [newChoice(), newChoice()],
    }))
  }
  function confirm() {
    if (!confirmation) return
    if (confirmation.kind === 'activate') {
      void persist(true)
      return
    }
    if (confirmation.kind === 'leave') {
      navigate('/dashboard')
      return
    }
    const action = confirmation
    if (action.kind === 'question') {
      changed()
      setQuestions((current) => current.filter((q) => q.key !== action.key))
    }
    if (action.kind === 'choice')
      updateQuestion(action.key, (q) => ({
        ...q,
        choices: q.choices.filter((choice) => choice.key !== action.choice),
      }))
    if (action.kind === 'type')
      updateQuestion(action.key, (q) => ({
        ...q,
        type: action.type,
        choices:
          action.type === 'true_false'
            ? [newChoice('True'), newChoice('False')]
            : [newChoice(), newChoice()],
      }))
    setConfirmation(null)
  }
  const confirmationText =
    confirmation?.kind === 'activate'
      ? {
          title: 'Save and activate this survey?',
          description:
            'Your draft will be saved first. Activation closes any currently active survey and makes this survey available for student submissions. Once activated, duplicate it to make future content changes.',
          label: 'Save and activate',
        }
      : confirmation?.kind === 'leave'
        ? {
            title: 'Leave without saving?',
            description:
              'Unsaved changes in this editor will be lost. Any previously saved draft stays in the database.',
            label: 'Leave editor',
          }
        : confirmation?.kind === 'type'
          ? {
              title: 'Replace the answer choices?',
              description:
                'Changing the question type replaces the current choices. Question text is preserved. This change is saved only when you save the draft.',
              label: 'Replace choices',
            }
          : {
              title:
                confirmation?.kind === 'question'
                  ? 'Delete this question?'
                  : 'Delete this choice?',
              description:
                'This removes the item from your draft. The change is saved only when you save the draft.',
              label:
                confirmation?.kind === 'question'
                  ? 'Delete question'
                  : 'Delete choice',
            }
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        className="text-teal-800 underline"
        to="/dashboard"
        onClick={(event) => {
          if (busy) {
            event.preventDefault()
            return
          }
          if (dirty) {
            event.preventDefault()
            setConfirmation({ kind: 'leave' })
          }
        }}
      >
        Back to dashboard
      </Link>
      <h1 className="my-6 text-3xl font-semibold">
        {id ? 'Edit draft survey' : 'New survey'}
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
          {!loaded ? (
            <button
              className="button-secondary"
              onClick={() => setAttempt((v) => v + 1)}
            >
              Retry loading survey
            </button>
          ) : !editable ? (
            <p>
              This survey cannot be edited. Return to the dashboard and
              duplicate it to create a draft.
            </p>
          ) : (
            <form
              onSubmit={submit}
              noValidate
              aria-busy={busy}
              className="space-y-6"
            >
              {Object.keys(errors).length > 0 && (
                <p role="alert" className="text-red-800">
                  Check the highlighted fields before saving.
                </p>
              )}
              <fieldset disabled={busy} className="space-y-5">
                <legend className="sr-only">Survey details</legend>
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
                    onChange={(event) => {
                      changed()
                      setTitle(event.target.value)
                    }}
                    aria-invalid={Boolean(errors.title)}
                    aria-describedby={errors.title ? 'title-error' : undefined}
                  />
                  {errors.title && (
                    <p id="title-error" className="mt-2 text-red-800">
                      {errors.title}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="description"
                    className="mb-2 block font-medium"
                  >
                    Description (optional)
                  </label>
                  <textarea
                    id="description"
                    className="field min-h-28"
                    maxLength={4000}
                    value={description}
                    onChange={(event) => {
                      changed()
                      setDescription(event.target.value)
                    }}
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={
                      errors.description ? 'description-error' : undefined
                    }
                  />
                  {errors.description && (
                    <p id="description-error" className="mt-2 text-red-800">
                      {errors.description}
                    </p>
                  )}
                </div>
              </fieldset>
              <section
                id="questions"
                tabIndex={-1}
                aria-label="Survey questions"
                className="space-y-5"
              >
                <h2 className="text-2xl font-semibold">Questions</h2>
                <p className="text-slate-600">
                  Students must answer every question. Move controls change the
                  order without losing your edits.
                </p>
                {errors.questions && (
                  <p className="text-red-800">{errors.questions}</p>
                )}
                {questions.length === 0 && (
                  <p className="rounded-lg border border-slate-300 bg-white p-5">
                    No questions yet. You can save an empty draft, but add a
                    question before activating.
                  </p>
                )}
                {questions.map((q, index) => (
                  <QuestionEditor
                    key={q.key}
                    question={q}
                    index={index}
                    total={questions.length}
                    busy={busy}
                    errors={errors}
                    onText={(text) =>
                      updateQuestion(q.key, (q) => ({ ...q, text }))
                    }
                    onType={(type) => changeType(q.key, type)}
                    onMove={(direction) => {
                      changed()
                      setQuestions((current) =>
                        moveItem(current, index, direction),
                      )
                      setAnnouncement(
                        `Question moved to position ${index + direction + 1}.`,
                      )
                    }}
                    onDelete={() =>
                      setConfirmation({ kind: 'question', key: q.key })
                    }
                    onChoiceText={(key, text) =>
                      updateQuestion(q.key, (q) => ({
                        ...q,
                        choices: q.choices.map((choice) =>
                          choice.key === key ? { ...choice, text } : choice,
                        ),
                      }))
                    }
                    onAddChoice={() =>
                      updateQuestion(q.key, (q) => ({
                        ...q,
                        choices: [...q.choices, newChoice()],
                      }))
                    }
                    onMoveChoice={(choiceIndex, direction) => {
                      updateQuestion(q.key, (q) => ({
                        ...q,
                        choices: moveItem(q.choices, choiceIndex, direction),
                      }))
                      setAnnouncement(
                        `Choice moved to position ${choiceIndex + direction + 1}.`,
                      )
                    }}
                    onDeleteChoice={(choice) =>
                      setConfirmation({ kind: 'choice', key: q.key, choice })
                    }
                  />
                ))}
                <button
                  type="button"
                  className="button-secondary"
                  disabled={busy || questions.length >= 100}
                  onClick={() => {
                    changed()
                    setQuestions((current) => [...current, newQuestion()])
                  }}
                >
                  Add question
                </button>
                <p className="sr-only" role="status">
                  {announcement}
                </p>
              </section>
              <div className="flex flex-wrap gap-3">
                <button className="button-primary" disabled={busy}>
                  {busy ? 'Saving…' : 'Save draft'}
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  disabled={busy}
                  onClick={() => {
                    if (validate(true)) setConfirmation({ kind: 'activate' })
                  }}
                >
                  Save and activate
                </button>
              </div>
            </form>
          )}
        </>
      )}
      {confirmation && (
        <ConfirmDialog
          {...confirmationText}
          busy={busy}
          error={null}
          onCancel={() => setConfirmation(null)}
          onConfirm={confirm}
        />
      )}
    </main>
  )
}
