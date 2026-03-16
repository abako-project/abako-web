import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';

/**
 * ProtectedRoute - Route guard for authenticated pages
 *
 * Checks if the user is authenticated via Zustand store (persisted in localStorage).
 * No server-side session validation needed since auth is fully client-side.
 *
 * - If authenticated → renders child routes via Outlet
 * - If not → redirects to /login
 */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/register" replace />;
  }

  return <Outlet />;
}
