import { Component, type ReactNode } from 'react'

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-xl px-6 py-16"
      >
        <h1 className="text-3xl font-semibold">Unable to display this page</h1>
        <p role="alert" className="my-6 text-slate-600">
          Reload to try again. If you just submitted a survey, keep using this
          browser so duplicate protection can recognize your response.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            className="button-primary"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
          <a className="button-secondary" href="/">
            Back to home
          </a>
        </div>
      </main>
    )
  }
}
