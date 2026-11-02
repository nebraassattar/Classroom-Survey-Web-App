import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
afterEach(cleanup)

// JSDOM does not implement native modal dialogs. Browser behavior is checked
// separately; this fixture exposes modal state for component assertions.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open')
}
