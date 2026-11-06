import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Role } from '../types';
import { PageLoading } from './LoadingState';
import { useAuth } from '../features/auth/AuthProvider';

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: Role[] }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoading label="Verificando la sesión…" />;
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
