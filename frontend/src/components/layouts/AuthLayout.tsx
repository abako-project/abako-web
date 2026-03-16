import { Outlet } from 'react-router-dom';

/**
 * AuthLayout - Layout for authentication pages (login, register)
 *
 * Figma design (76:69099): Split screen layout with brand content on left, auth form on right.
 * Left panel features:
 *   - Dark background with decorative SVG flow-field pattern
 *   - Centered Abako logo (~350px, rotated ~10deg) with green glow
 *   - Glassmorphism diamond shape behind logo
 *   - Circle shape to the right of logo
 *   - Top-left: small logo + "Abako" text
 *   - Bottom-left: "Welcome to Abako" title (36px bold)
 */
export function AuthLayout() {
  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Left side - Brand/visual (hidden on mobile, visible lg+) */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between relative overflow-hidden"
        style={{ backgroundColor: 'var(--base-surface-2, #231f1f)' }}
      >
        {/* Background pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/images/abako-bg-pattern.svg')",
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        />

        {/* Top-left: Logo + brand name */}
        <div className="relative z-10 p-8 flex items-center gap-2">
          <AbakoLogoSmall />
          <span
            className="text-base font-semibold"
            style={{ color: 'var(--text-dark-primary, #f5f5f5)' }}
          >
            Abako
          </span>
        </div>

        {/* Center: Logo composition */}
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <div className="relative" style={{ width: 405, height: 405 }}>
            {/* Diamond shape (glassmorphism, behind logo) */}
            <div
              className="absolute"
              style={{
                width: 108,
                height: 108,
                left: 54,
                top: 157,
                transform: 'rotate(30deg)',
                borderRadius: 'var(--radi-6, 12px)',
                border: '1px solid var(--base-border, #3d3d3d)',
                backdropFilter: 'blur(20px)',
                backgroundImage:
                  'linear-gradient(139deg, rgba(255,255,255,0) 12%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.06) 82%)',
                mixBlendMode: 'multiply',
              }}
            />

            {/* Main Abako logo (rotated ~10deg) */}
            <div
              className="absolute flex items-center justify-center"
              style={{
                width: 350,
                height: 350,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%) rotate(9.95deg)',
                filter: 'drop-shadow(0 0 40px rgba(54, 211, 153, 0.3))',
              }}
            >
              <AbakoLogoLarge />
            </div>

            {/* Circle shape (glassmorphism, to the right) */}
            <div
              className="absolute"
              style={{
                width: 94,
                height: 94,
                right: -10,
                top: 110,
              }}
            >
              <img
                src="/images/abako-circle-shape.svg"
                alt=""
                className="w-full h-full"
              />
            </div>
          </div>
        </div>

        {/* Bottom-left: Welcome text */}
        <div className="relative z-10 p-8 pb-12">
          <h1
            className="text-[var(--font-size-4xl,36px)] font-bold leading-[var(--line-height-4xl,52px)]"
            style={{ color: 'var(--text-dark-primary, #f5f5f5)' }}
          >
            Welcome to Abako
          </h1>
        </div>
      </div>

      {/* Right side - Auth content */}
      <div
        className="flex-1 flex items-center justify-center p-8"
        style={{ backgroundColor: 'var(--base-surface-1, #141414)' }}
      >
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

/**
 * Small Abako logo icon for the top-left corner.
 * Renders the green Abako mark at 24x16px.
 */
function AbakoLogoSmall() {
  return (
    <svg
      width="28"
      height="20"
      viewBox="0 0 280 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left part - the "W" shape */}
      <path
        d="M16.1366 0H70.8272C70.8272 0 133.885 5.60515 133.885 67.2618L133.885 83.4883C133.885 100.234 112.559 106.516 103.213 93.553C102.836 93.0305 102.479 92.4768 102.143 91.8912L100.22 88.5354C97.0574 84.0093 91.8655 81.2747 86.2861 81.2747H41.8273C35.848 81.2747 30.4082 77.8168 27.8704 72.4028C23.0791 62.1813 30.5386 50.4463 41.8273 50.4463H56.8144H81.8148C88.4621 50.4463 92.8704 43.5564 90.0849 37.521C88.5961 34.2953 85.3676 32.2296 81.8148 32.2296H16.1366C10.1327 32.2296 4.62661 28.8919 1.84942 23.569C-3.74815 12.8403 4.03542 0 16.1366 0Z"
        fill="var(--state-brand-active, #36D399)"
        transform="translate(0, 50)"
      />
      {/* Right top part */}
      <path
        d="M33.4896 0H17.0224C4.3268 0 -3.88918 13.4106 1.877 24.7212L47.436 114.087C53.6583 126.292 71.0221 126.501 77.5365 114.45L85.9308 98.9202C88.5837 94.0123 88.6596 88.1152 86.1341 83.1406L48.6479 9.30423C45.75 3.59616 39.8911 0 33.4896 0Z"
        fill="var(--state-brand-active, #36D399)"
        transform="translate(120, 38)"
      />
      {/* Right bottom part */}
      <path
        d="M33.4896 0H17.0224C4.3268 0 -3.88918 13.4106 1.877 24.7212L47.436 114.087C53.6583 126.292 71.0221 126.501 77.5365 114.45L85.9308 98.9202C88.5837 94.0123 88.6596 88.1152 86.1341 83.1406L48.6479 9.30423C45.75 3.59616 39.8911 0 33.4896 0Z"
        fill="var(--state-brand-active, #36D399)"
        transform="translate(190, 38)"
      />
    </svg>
  );
}

/**
 * Large Abako logo for the center of the auth layout.
 * Renders the full green Abako mark at ~350px.
 */
function AbakoLogoLarge() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 280 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left part - the "W" shape */}
      <path
        d="M16.1366 0H70.8272C70.8272 0 133.885 5.60515 133.885 67.2618L133.885 83.4883C133.885 100.234 112.559 106.516 103.213 93.553C102.836 93.0305 102.479 92.4768 102.143 91.8912L100.22 88.5354C97.0574 84.0093 91.8655 81.2747 86.2861 81.2747H41.8273C35.848 81.2747 30.4082 77.8168 27.8704 72.4028C23.0791 62.1813 30.5386 50.4463 41.8273 50.4463H56.8144H81.8148C88.4621 50.4463 92.8704 43.5564 90.0849 37.521C88.5961 34.2953 85.3676 32.2296 81.8148 32.2296H16.1366C10.1327 32.2296 4.62661 28.8919 1.84942 23.569C-3.74815 12.8403 4.03542 0 16.1366 0Z"
        fill="var(--state-brand-active, #36D399)"
        transform="translate(0, 50)"
      />
      {/* Right top part */}
      <path
        d="M33.4896 0H17.0224C4.3268 0 -3.88918 13.4106 1.877 24.7212L47.436 114.087C53.6583 126.292 71.0221 126.501 77.5365 114.45L85.9308 98.9202C88.5837 94.0123 88.6596 88.1152 86.1341 83.1406L48.6479 9.30423C45.75 3.59616 39.8911 0 33.4896 0Z"
        fill="var(--state-brand-active, #36D399)"
        transform="translate(120, 38)"
      />
      {/* Right bottom part */}
      <path
        d="M33.4896 0H17.0224C4.3268 0 -3.88918 13.4106 1.877 24.7212L47.436 114.087C53.6583 126.292 71.0221 126.501 77.5365 114.45L85.9308 98.9202C88.5837 94.0123 88.6596 88.1152 86.1341 83.1406L48.6479 9.30423C45.75 3.59616 39.8911 0 33.4896 0Z"
        fill="var(--state-brand-active, #36D399)"
        transform="translate(190, 38)"
      />
    </svg>
  );
}
