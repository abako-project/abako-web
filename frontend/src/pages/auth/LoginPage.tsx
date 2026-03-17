import { Link } from 'react-router-dom';

/**
 * Role Selection Page - Login
 *
 * Figma design: Role selector with two styled cards for Client and Developer.
 * Users choose their account type to continue to the appropriate login page.
 * A third option below the role cards allows signing in via a Polkadot wallet
 * extension (Talisman, Polkadot.js, SubWallet).
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

      {/* Divider */}
      <div className="my-6 flex items-center gap-4">
        <div
          className="flex-1"
          style={{ height: '1px', backgroundColor: 'var(--base-border, #3d3d3d)' }}
        />
        <span
          style={{
            fontSize: '13px',
            color: 'var(--text-dark-secondary, rgba(255,255,255,0.4))',
            flexShrink: 0,
          }}
        >
          or connect with your wallet
        </span>
        <div
          className="flex-1"
          style={{ height: '1px', backgroundColor: 'var(--base-border, #3d3d3d)' }}
        />
      </div>

      {/* Wallet Login Card */}
      <Link to="/login/wallet" className="block">
        <div
          className="p-5 transition-all hover:opacity-90 cursor-pointer flex items-center gap-4"
          style={{
            backgroundColor: 'var(--base-surface-2, #231f1f)',
            border: '1px solid var(--base-border, #3d3d3d)',
            borderRadius: '12px',
          }}
        >
          {/* Wallet icon cluster */}
          <div className="flex items-center -space-x-2 flex-shrink-0">
            {/* Talisman */}
            <div style={{ zIndex: 3 }}>
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 7 }}>
                <rect width="32" height="32" rx="8" fill="#D5FF5C" />
                <path d="M16 6C10.477 6 6 10.477 6 16s4.477 10 10 10 10-4.477 10-10S21.523 6 16 6z" fill="#1A1A1A" />
                <path d="M16 9a7 7 0 100 14A7 7 0 0016 9zm0 2a5 5 0 110 10A5 5 0 0116 11z" fill="#D5FF5C" />
              </svg>
            </div>
            {/* Polkadot.js */}
            <div style={{ zIndex: 2 }}>
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 7, outline: '2px solid var(--base-surface-2, #231f1f)' }}>
                <rect width="32" height="32" rx="8" fill="#E6007A" />
                <circle cx="16" cy="16" r="6" fill="white" />
                <circle cx="16" cy="7" r="2.5" fill="white" />
                <circle cx="16" cy="25" r="2.5" fill="white" />
                <circle cx="7" cy="16" r="2.5" fill="white" />
                <circle cx="25" cy="16" r="2.5" fill="white" />
              </svg>
            </div>
            {/* SubWallet */}
            <div style={{ zIndex: 1 }}>
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 7, outline: '2px solid var(--base-surface-2, #231f1f)' }}>
                <rect width="32" height="32" rx="8" fill="#4CEAAC" />
                <path d="M10 12h12M10 16h8M10 20h10" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h2
              className="font-semibold mb-0.5"
              style={{ fontSize: '16px', color: 'var(--text-dark-primary, #f5f5f5)' }}
            >
              Polkadot Wallet
            </h2>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-dark-secondary, rgba(255,255,255,0.6))',
              }}
            >
              Talisman, Polkadot.js, SubWallet
            </p>
          </div>

          {/* Arrow icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{ color: 'var(--text-dark-secondary, rgba(255,255,255,0.4))', flexShrink: 0 }}
          >
            <path
              d="M6 3l5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </Link>

      <div className="mt-6 text-center">
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
