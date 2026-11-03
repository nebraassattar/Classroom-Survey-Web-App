import { useEffect, useRef } from 'react'

export function ConfirmDialog({
  title,
  description,
  label,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  title: string
  description: string
  label: string
  busy: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const element = dialog.current
    element?.showModal()
    cancel.current?.focus()
    return () => {
      element?.close()
      if (previous?.isConnected) previous.focus()
      else document.getElementById('main-content')?.focus()
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border-0 bg-white p-6 shadow-xl backdrop:bg-slate-900/50"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onCancel()
      }}
    >
      <h2 id="confirm-title" className="text-xl font-semibold">
        {title}
      </h2>
      <p
        id="confirm-description"
        className="my-5 whitespace-pre-line text-slate-600"
      >
        {description}
      </p>
      {error && (
        <p className="mb-4 text-red-800" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <button
          ref={cancel}
          className="button-secondary"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button className="button-primary" disabled={busy} onClick={onConfirm}>
          {busy ? 'Working…' : label}
        </button>
      </div>
    </dialog>
  )
}
