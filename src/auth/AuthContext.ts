import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type AuthStatus =
  'loading' | 'signed-out' | 'authorized' | 'denied' | 'error'
export interface AuthContextValue {
  status: AuthStatus
  session: Session | null
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<string | null>
  retry: () => void
}
export const AuthContext = createContext<AuthContextValue | null>(null)
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider is required')
  return context
}
