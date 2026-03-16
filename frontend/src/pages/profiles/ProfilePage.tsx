/**
 * ProfilePage - User profile router
 *
 * Detects the authenticated user's role (client or developer) and renders
 * the appropriate profile page component. This is the entry point mounted
 * at /profile in the app router.
 *
 * Role detection:
 *   - If user.clientId is set -> render ClientProfilePage
 *   - If user.developerId is set -> render DeveloperProfilePage
 *   - Otherwise -> show an error state
 */

import { useAuthStore } from '@stores/authStore';
import { Card, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { useNavigate, useLocation } from 'react-router-dom';
import ClientProfilePage from './ClientProfilePage';
import DeveloperProfilePage from './DeveloperProfilePage';

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();

  // Detect if the /profile/edit route was requested
  const startInEditMode = location.pathname === '/profile/edit';

  // No user in store (should not happen behind ProtectedRoute)
  if (!user) {
    return (
      <div className="px-8 lg:px-14 py-10">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/15 flex items-center justify-center">
              <i className="ri-user-unfollow-line text-2xl text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Not Authenticated
            </h2>
            <p className="text-muted-foreground mb-4">
              Please log in to view your profile.
            </p>
            <Button variant="outline" onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Client profile (renders its own full-width layout matching the developer profile)
  if (user.clientId) {
    return <ClientProfilePage clientId={user.clientId} startInEditMode={startInEditMode} />;
  }

  // Developer profile (renders its own full-width layout matching Figma)
  if (user.developerId) {
    return <DeveloperProfilePage developerId={user.developerId} startInEditMode={startInEditMode} />;
  }

  // User has neither client nor developer profile
  return (
    <div className="px-8 lg:px-14 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Profile</h1>
      </div>
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-yellow-500/15 flex items-center justify-center">
            <i className="ri-user-settings-line text-2xl text-yellow-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No Profile Found
          </h2>
          <p className="text-muted-foreground mb-4">
            Your account does not have a client or developer profile associated with it.
            Please contact support if you believe this is an error.
          </p>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
