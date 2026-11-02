import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { AuthStatusPanel } from '../components/AuthStatusPanel'

export function ProtectedRoute() {
  const auth = useAuth()
  if (auth.status === 'signed-out') return <Navigate to="/login" replace />
  if (auth.status !== 'authorized') return <AuthStatusPanel />
  return <Outlet />
}
