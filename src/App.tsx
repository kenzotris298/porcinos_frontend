import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastProvider } from './components/ToastProvider';
import { LocalDataProvider } from './data/LocalDataProvider';
import { AuthProvider } from './features/auth/AuthProvider';
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EvaluationDetailPage } from './pages/EvaluationDetailPage';
import { EvaluationsPage } from './pages/EvaluationsPage';
import { EvidencePage } from './pages/EvidencePage';
import { IndicatorsPage } from './pages/IndicatorsPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PeopleFarmsPage } from './pages/PeopleFarmsPage';
import { RecommendationsPage } from './pages/RecommendationsPage';

export function App() {
  return (
    <BrowserRouter basename="/porcinos_frontend">
      <AuthProvider>
        <ToastProvider>
          <LocalDataProvider>
            <ErrorBoundary>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppShell />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="evaluaciones" element={<EvaluationsPage />} />
                    <Route path="evaluaciones/:id" element={<EvaluationDetailPage />} />
                    <Route path="evaluaciones/:id/indicadores/:libertyId" element={<EvaluationDetailPage />} />
                    <Route path="indicadores" element={<IndicatorsPage />} />
                    <Route path="evidencias" element={<EvidencePage />} />
                    <Route path="recomendaciones" element={<RecommendationsPage />} />
                    <Route element={<ProtectedRoute allowedRoles={['evaluator']} />}>
                      <Route path="personas-predios" element={<PeopleFarmsPage />} />
                    </Route>
                    <Route path="metodologia" element={<MethodologyPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Route>
              </Routes>
            </ErrorBoundary>
          </LocalDataProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
