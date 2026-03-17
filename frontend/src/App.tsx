import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '@components/shared/ErrorBoundary';
import { ProtectedRoute } from '@components/shared/ProtectedRoute';
import { AppLayout } from '@components/layouts/AppLayout';
import { AuthLayout } from '@components/layouts/AuthLayout';
import { Spinner } from '@components/ui/Spinner';

// Auth Pages
import LoginPage from '@pages/auth/LoginPage';
import ClientLoginPage from '@pages/auth/ClientLoginPage';
import DeveloperLoginPage from '@pages/auth/DeveloperLoginPage';
import WalletLoginPage from '@pages/auth/WalletLoginPage';
import RegisterPage from '@pages/auth/RegisterPage';
import ClientRegisterPage from '@pages/auth/ClientRegisterPage';
import DeveloperRegisterPage from '@pages/auth/DeveloperRegisterPage';

// Protected Pages
import DashboardPage from '@pages/dashboard/DashboardPage';
import ProjectsPage from '@pages/projects/ProjectsPage';
import CreateProjectPage from '@pages/projects/CreateProjectPage';
import ProjectDetailPage from '@pages/projects/ProjectDetailPage';
import ScopeReviewPage from '@pages/projects/ScopeReviewPage';
import ProfilePage from '@pages/profiles/ProfilePage';
import SettingsPage from '@pages/settings/SettingsPage';
import PaymentsPage from '@pages/payments/PaymentsPage';
import PaymentDetailPage from '@pages/payments/PaymentDetailPage';
import PaymentFundPage from '@pages/payments/PaymentFundPage';
import MilestoneReviewPage from '@pages/milestones/MilestoneReviewPage';
import TeamEvaluationPage from '@pages/projects/TeamEvaluationPage';
import DeveloperEvaluationPage from '@pages/projects/DeveloperEvaluationPage';
import ConsultantEvaluationPage from '@pages/projects/ConsultantEvaluationPage';

// Lazy-loaded: DAO View (Kreivo chain data, ~15 KB isolated chunk)
const DaoViewPage = lazy(() => import('@pages/profiles/DaoViewPage'));

/**
 * App - Main application router
 *
 * Route structure:
 * - /login -> Role selection page
 * - /login/client -> Client login with WebAuthn
 * - /login/developer -> Developer login with WebAuthn
 * - / -> Redirects to /dashboard
 * - /dashboard -> Dashboard page (protected)
 * - /projects -> Projects list (protected)
 * - /projects/new -> Create project proposal (protected, client only)
 * - /projects/:id -> Project detail (protected)
 * - /profile -> User profile (protected)
 *
 * All protected routes require authentication and are wrapped in AppLayout.
 * Auth routes are wrapped in AuthLayout for a clean login experience.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Auth Routes - wrapped in AuthLayout */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/client" element={<ClientLoginPage />} />
          <Route path="/login/developer" element={<DeveloperLoginPage />} />
          <Route path="/login/wallet" element={<WalletLoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/client" element={<ClientRegisterPage />} />
          <Route path="/register/developer" element={<DeveloperRegisterPage />} />
        </Route>

        {/* Protected Routes - wrapped in ProtectedRoute and AppLayout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Dashboard */}
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Projects */}
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/new" element={<CreateProjectPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/projects/:id/review-scope" element={<ScopeReviewPage />} />
            <Route path="/projects/:projectId/milestones/:milestoneId/review" element={<MilestoneReviewPage />} />
            <Route path="/projects/:id/evaluate" element={<TeamEvaluationPage />} />
            <Route path="/projects/:id/evaluate/developer" element={<DeveloperEvaluationPage />} />
            <Route path="/projects/:id/evaluate/consultant" element={<ConsultantEvaluationPage />} />

            {/* Payments */}
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/payments/:id" element={<PaymentDetailPage />} />
            <Route path="/payments/:id/fund" element={<PaymentFundPage />} />

            {/* Profile */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<ProfilePage />} />

            {/* Settings */}
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile/dao" element={<Suspense fallback={<div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>}><DaoViewPage /></Suspense>} />
          </Route>
        </Route>

        {/* Catch-all - redirect to register (default entry point) */}
        <Route path="*" element={<Navigate to="/register" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
