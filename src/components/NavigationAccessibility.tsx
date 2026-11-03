import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function routeTitle(path: string) {
  if (path === '/') return 'Classroom Survey'
  if (path === '/login') return 'Instructor login · Classroom Survey'
  if (path === '/dashboard') return 'Instructor dashboard · Classroom Survey'
  if (path.startsWith('/s/')) return 'Student survey · Classroom Survey'
  if (path.endsWith('/results')) return 'Survey results · Classroom Survey'
  if (path.endsWith('/present')) return 'Present survey · Classroom Survey'
  if (path === '/surveys/new' || path.endsWith('/edit'))
    return 'Survey editor · Classroom Survey'
  return 'Page not found · Classroom Survey'
}
export function NavigationAccessibility() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = routeTitle(pathname)
    function focusHeading() {
      const main = document.querySelector('main:not([aria-busy="true"])')
      const heading = main?.querySelector('h1')
      if (!(heading instanceof HTMLElement)) return
      if (
        document.activeElement &&
        document.activeElement !== document.body &&
        document.activeElement.isConnected
      ) {
        observer?.disconnect()
        return
      }
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
      window.scrollTo(0, 0)
      observer?.disconnect()
    }
    const observer = new MutationObserver(focusHeading)
    observer.observe(document.getElementById('root') ?? document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-busy'],
    })
    focusHeading()
    const timeout = setTimeout(() => observer?.disconnect(), 20000)
    return () => {
      observer?.disconnect()
      clearTimeout(timeout)
    }
  }, [pathname])
  return (
    <a
      className="skip-link"
      href="#main-content"
      onClick={(event) => {
        const main = document.getElementById('main-content')
        if (main) {
          event.preventDefault()
          main.focus()
        }
      }}
    >
      Skip to content
    </a>
  )
}
