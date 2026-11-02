import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { AuthContext, type AuthStatus } from './AuthContext'
import { createSupabaseClient } from '../lib/supabase'

interface Snapshot {
  session: Session | null
  ready: boolean
  failed: boolean
}
interface Authorization {
  snapshot: Snapshot
  allowed: boolean
  failed: boolean
}

export function AuthProvider({
  children,
  client: suppliedClient,
}: {
  children: ReactNode
  client?: SupabaseClient
}) {
  const client = useMemo(() => {
    try {
      return suppliedClient ?? createSupabaseClient()
    } catch {
      return null
    }
  }, [suppliedClient])
  const [snapshot, setSnapshot] = useState<Snapshot>({
    session: null,
    ready: false,
    failed: false,
  })
  const [authorization, setAuthorization] = useState<Authorization | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!client) return
    let alive = true
    let events = 0
    const sessionTimeout = setTimeout(() => {
      if (alive) setSnapshot({ session: null, ready: true, failed: true })
    }, 15000)
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      events++
      clearTimeout(sessionTimeout)
      if (alive) setSnapshot({ session, ready: true, failed: false })
    })
    const initialEvents = 0
    void client.auth
      .getSession()
      .then(({ data, error }) => {
        clearTimeout(sessionTimeout)
        if (alive && events === initialEvents)
          setSnapshot({
            session: data.session,
            ready: true,
            failed: Boolean(error),
          })
      })
      .catch(() => {
        clearTimeout(sessionTimeout)
        if (alive && events === initialEvents)
          setSnapshot({ session: null, ready: true, failed: true })
      })
    return () => {
      alive = false
      clearTimeout(sessionTimeout)
      subscription.unsubscribe()
    }
  }, [client, attempt])
  // Separate from the synchronous auth listener to avoid Auth lock deadlocks.
  useEffect(() => {
    if (!client || !snapshot.session || snapshot.failed) return
    let alive = true
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    void (async () => {
      try {
        const { data, error } = await client
          .rpc('is_instructor')
          .abortSignal(controller.signal)
        if (alive)
          setAuthorization({
            snapshot,
            allowed: data === true && !error,
            failed: Boolean(error),
          })
      } catch {
        if (alive) setAuthorization({ snapshot, allowed: false, failed: true })
      } finally {
        clearTimeout(timeout)
      }
    })()
    return () => {
      alive = false
      controller.abort()
      clearTimeout(timeout)
    }
  }, [client, snapshot])
  let status: AuthStatus = 'loading'
  if (!client || snapshot.failed) status = 'error'
  else if (snapshot.ready && !snapshot.session) status = 'signed-out'
  else if (authorization?.snapshot === snapshot)
    status = authorization.failed
      ? 'error'
      : authorization.allowed
        ? 'authorized'
        : 'denied'
  async function signIn(email: string, password: string) {
    if (!client) return 'Authentication is not configured. Check local setup.'
    try {
      const { error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error)
        return error.status === 400 || error.status === 422
          ? 'Unable to log in. Check your email and password and confirm your account is enabled.'
          : 'Unable to connect. Please try again.'
      return null
    } catch {
      return 'Unable to connect. Please try again.'
    }
  }
  async function signOut() {
    if (!client) return 'Authentication is not configured.'
    try {
      const { error } = await client.auth.signOut({ scope: 'local' })
      if (error) return 'Unable to log out. Please try again.'
      setSnapshot({ session: null, ready: true, failed: false })
      return null
    } catch {
      return 'Unable to log out. Please try again.'
    }
  }
  function retry() {
    setSnapshot({ session: null, ready: false, failed: false })
    setAttempt((current) => current + 1)
  }
  return (
    <AuthContext.Provider
      value={{ status, session: snapshot.session, signIn, signOut, retry }}
    >
      {children}
    </AuthContext.Provider>
  )
}
