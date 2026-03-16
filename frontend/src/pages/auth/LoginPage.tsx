import { Link } from 'react-router-dom';

/**
 * Role Selection Page - Login
 *
 * Figma design: Role selector with two styled cards for Client and Developer.
 * Users choose their account type to continue to the appropriate login page.
 */
export default function LoginPage() {
  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1
          className="font-bold mb-2"
          style={{
            fontSize: '30px',
            lineHeight: '1.2',
            color: 'var(--text-dark-primary, #f5f5f5)',
          }}
        >
          Welcome to Abako
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))',
          }}
        >
          Select your account type to continue
        </p>
      </div>

      <div className="space-y-4">
        {/* Client Card */}
        <Link to="/login/client" className="block">
          <div
            className="p-6 transition-all hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: 'var(--base-surface-2, #231f1f)',
              border: '1px solid var(--base-border, #3d3d3d)',
              borderRadius: '12px',
            }}
          >
            <h2
              className="font-semibold mb-2"
              style={{
                fontSize: '20px',
                color: 'var(--text-dark-primary, #f5f5f5)',
              }}
            >
              Client
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))',
              }}
            >
              Login as a client to manage your projects and milestones
            </p>
          </div>
        </Link>

        {/* Developer Card */}
        <Link to="/login/developer" className="block">
          <div
            className="p-6 transition-all hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: 'var(--base-surface-2, #231f1f)',
              border: '1px solid var(--base-border, #3d3d3d)',
              borderRadius: '12px',
            }}
          >
            <h2
              className="font-semibold mb-2"
              style={{
                fontSize: '20px',
                color: 'var(--text-dark-primary, #f5f5f5)',
              }}
            >
              Developer
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))',
              }}
            >
              Login as a developer to work on assigned tasks and milestones
            </p>
          </div>
        </Link>
      </div>

      <div className="mt-8 text-center">
        <p style={{ fontSize: '14px', color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))' }}>
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-medium hover:underline"
            style={{ color: 'var(--state-brand-active, #36d399)' }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
