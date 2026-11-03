import type { EditorQuestion } from '../lib/draftEditor'

export function QuestionEditor({
  question,
  index,
  total,
  busy,
  errors,
  onText,
  onType,
  onMove,
  onDelete,
  onChoiceText,
  onAddChoice,
  onMoveChoice,
  onDeleteChoice,
}: {
  question: EditorQuestion
  index: number
  total: number
  busy: boolean
  errors: Record<string, string>
  onText: (text: string) => void
  onType: (type: EditorQuestion['type']) => void
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
  onChoiceText: (key: string, text: string) => void
  onAddChoice: () => void
  onMoveChoice: (index: number, direction: -1 | 1) => void
  onDeleteChoice: (key: string) => void
}) {
  const q = question
  return (
    <fieldset
      className="min-w-0 rounded-xl border border-slate-300 bg-white p-5"
      disabled={busy}
    >
      <legend className="px-2 text-lg font-semibold">
        Question {index + 1}
      </legend>
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          className="button-secondary"
          aria-label={`Move question ${index + 1} up`}
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          Move up
        </button>
        <button
          type="button"
          className="button-secondary"
          aria-label={`Move question ${index + 1} down`}
          disabled={index === total - 1}
          onClick={() => onMove(1)}
        >
          Move down
        </button>
        <button
          type="button"
          className="button-secondary text-red-800"
          aria-label={`Delete question ${index + 1}`}
          onClick={onDelete}
        >
          Delete question
        </button>
      </div>
      <label className="mb-2 block font-medium" htmlFor={q.key}>
        Question {index + 1} text
      </label>
      <textarea
        id={q.key}
        className="field"
        maxLength={2000}
        required
        value={q.text}
        onChange={(event) => onText(event.target.value)}
        aria-invalid={Boolean(errors[q.key])}
        aria-describedby={errors[q.key] ? `${q.key}-error` : undefined}
      />
      {errors[q.key] && (
        <p id={`${q.key}-error`} className="mt-2 text-red-800">
          {errors[q.key]}
        </p>
      )}
      <label className="mt-5 mb-2 block font-medium" htmlFor={`${q.key}-type`}>
        Question {index + 1} type
      </label>
      <select
        id={`${q.key}-type`}
        className="field"
        value={q.type}
        onChange={(event) =>
          onType(event.target.value as EditorQuestion['type'])
        }
      >
        <option value="multiple_choice">Multiple choice</option>
        <option value="true_false">True / False</option>
      </select>
      <div id={`${q.key}-choices`} tabIndex={-1} className="mt-5 space-y-4">
        {errors[`${q.key}-choices`] && (
          <p className="text-red-800">{errors[`${q.key}-choices`]}</p>
        )}
        {q.type === 'true_false' ? (
          <p className="text-slate-600">Fixed choices: True and False.</p>
        ) : (
          q.choices.map((choice, choiceIndex) => (
            <div key={choice.key}>
              <label className="mb-2 block font-medium" htmlFor={choice.key}>
                Question {index + 1}, choice {choiceIndex + 1}
              </label>
              <input
                id={choice.key}
                className="field"
                maxLength={1000}
                required
                value={choice.text}
                onChange={(event) =>
                  onChoiceText(choice.key, event.target.value)
                }
                aria-invalid={Boolean(errors[choice.key])}
                aria-describedby={
                  errors[choice.key] ? `${choice.key}-error` : undefined
                }
              />
              {errors[choice.key] && (
                <p id={`${choice.key}-error`} className="mt-2 text-red-800">
                  {errors[choice.key]}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="button-secondary"
                  aria-label={`Move question ${index + 1} choice ${choiceIndex + 1} up`}
                  disabled={choiceIndex === 0}
                  onClick={() => onMoveChoice(choiceIndex, -1)}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  aria-label={`Move question ${index + 1} choice ${choiceIndex + 1} down`}
                  disabled={choiceIndex === q.choices.length - 1}
                  onClick={() => onMoveChoice(choiceIndex, 1)}
                >
                  Move down
                </button>
                <button
                  type="button"
                  className="button-secondary text-red-800"
                  aria-label={`Delete question ${index + 1} choice ${choiceIndex + 1}`}
                  disabled={q.choices.length <= 2}
                  onClick={() => onDeleteChoice(choice.key)}
                >
                  Delete choice
                </button>
              </div>
            </div>
          ))
        )}
        {q.type === 'multiple_choice' && (
          <>
            <button
              type="button"
              className="button-secondary"
              disabled={q.choices.length >= 20}
              onClick={onAddChoice}
            >
              Add choice to question {index + 1}
            </button>
            <p className="text-sm text-slate-600">
              Provide 2–20 choices. Each student selects one answer.
            </p>
          </>
        )}
      </div>
    </fieldset>
  )
}
