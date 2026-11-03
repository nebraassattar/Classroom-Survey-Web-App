import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { SetupPage } from './pages/SetupPage'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import './styles.css'

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
)
const SurveyDraftPage = lazy(() =>
  import('./pages/SurveyDraftPage').then((module) => ({
    default: module.SurveyDraftPage,
  })),
)
const PresentSurveyPage = lazy(() =>
  import('./pages/PresentSurveyPage').then((module) => ({
    default: module.PresentSurveyPage,
  })),
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Suspense
          fallback={
            <main className="px-6 py-12" role="status">
              Loading page…
            </main>
          }
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/surveys/new" element={<SurveyDraftPage />} />
              <Route path="/surveys/:id/edit" element={<SurveyDraftPage />} />
              <Route
                path="/surveys/:id/present"
                element={<PresentSurveyPage />}
              />
            </Route>
            <Route path="*" element={<SetupPage notFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
