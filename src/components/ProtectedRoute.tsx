import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
  const adminCode = import.meta.env.VITE_ADMIN_CODE;

  // Si pas de code configuré, accès libre
  if (!adminCode) {
    return <>{children}</>;
  }

  // Si code configuré mais pas authentifié, rediriger
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
