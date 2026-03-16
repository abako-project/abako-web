/**
 * DaoViewPage - DAO governance data overview for the authenticated user.
 *
 * Accessible via the "DAO View" button on DeveloperProfilePage.
 * Route: /profile/dao
 *
 * Layout (matches the existing profile page full-width dark theme):
 *
 *   +----------------------------------------------------------+
 *   |  HEADER: back arrow + "DAO View" title + Live indicator  |
 *   +----------------------------------------------------------+
 *   |  3-column grid (responsive: 3col -> 2col -> 1col):       |
 *   |  +------------+ +------------+ +------------+            |
 *   |  | ExplorerCard| |CommunitiesCard| |WalletCard|          |
 *   |  +------------+ +------------+ +------------+            |
 *   +----------------------------------------------------------+
 *
 * The page reads the blockchain address from the authenticated user's profile.
 * It uses useMembershipNFT (already in the codebase) to resolve the ss58
 * address from the developer's email, then passes it to WalletCard.
 *
 * Note: ExplorerCard and CommunitiesCard are NOT address-dependent; they show
 * global Kreivo chain data.
 */

import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';
import { useMembershipNFT } from '@hooks/useMembership';
import { useExplorerData } from '@hooks/useExplorerData';
import { Button } from '@components/ui/Button';
import { ExplorerCard } from '@components/features/dao/ExplorerCard';
import { CommunitiesCard } from '@components/features/dao/CommunitiesCard';
import { WalletCard } from '@components/features/dao/WalletCard';
import { LiveIndicator } from '@components/features/dao/LiveIndicator';
import type { LiveStatus } from '@components/features/dao/LiveIndicator';

// ---------------------------------------------------------------------------
// Sub-component: PageHeader
// ---------------------------------------------------------------------------

interface PageHeaderProps {
  address: string | null;
  liveStatus: LiveStatus;
  lastSyncedSeconds: number | undefined;
  onBack: () => void;
}

function PageHeader({ address, liveStatus, lastSyncedSeconds, onBack }: PageHeaderProps) {
  return (
    <div className="w-full bg-[var(--base-surface-2,#231f1f)] border-b border-[var(--base-border,#3d3d3d)] px-8 lg:px-14 py-6">
      <div className="flex items-center justify-between gap-4">
        {/* Left: back button + title */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--base-border,#3d3d3d)] bg-transparent hover:bg-[var(--base-fill-1,#333)] transition-colors flex-shrink-0"
            aria-label="Back to profile"
          >
            <i className="ri-arrow-left-line text-lg text-[var(--text-dark-primary,#f5f5f5)]" />
          </button>

          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-[30px] text-[var(--text-dark-primary,#f5f5f5)]">
              DAO View
            </h1>
            <p className="text-xs text-[var(--text-dark-tertiary,rgba(255,255,255,0.36))]">
              Kreivo on-chain governance data
            </p>
          </div>
        </div>

        {/* Right: address pill + live indicator */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Truncated address pill (hidden on small screens) */}
          {address && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--base-fill-1,#333)] border border-[var(--base-border,#3d3d3d)]">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background: 'var(--state-brand-active, #36d399)',
                  boxShadow: '0 0 4px #36d399',
                }}
                aria-hidden="true"
              />
              <span className="text-xs font-mono text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
                {address.slice(0, 6)}&hellip;{address.slice(-6)}
              </span>
            </div>
          )}

          {/* Live status indicator */}
          <LiveIndicator status={liveStatus} lastSyncedSeconds={lastSyncedSeconds} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a TanStack Query `dataUpdatedAt` timestamp (milliseconds) into
 * the number of whole seconds since the data was last fetched.
 */
function secondsSince(timestampMs: number): number {
  return Math.floor((Date.now() - timestampMs) / 1_000);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Full-page DAO View accessible from the developer profile.
 *
 * @example
 * ```tsx
 * // In App.tsx:
 * <Route path="/profile/dao" element={<DaoViewPage />} />
 * ```
 */
export default function DaoViewPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  // Resolve blockchain address via the existing useMembershipNFT hook.
  // The hook accepts undefined gracefully (queries are disabled when falsy).
  const email = user?.email ?? undefined;
  const { data: membership, isLoading: isResolvingAddress } = useMembershipNFT(email);

  const blockchainAddress = membership?.address ?? null;

  // Subscribe to explorer data to derive the live status shown in the header.
  // We reuse the same query key so no extra network requests are made --
  // ExplorerCard mounts its own useExplorerData() call and they share the cache.
  const { isLoading: isExplorerLoading, isError: isExplorerError, dataUpdatedAt } =
    useExplorerData();

  // Derive the connection status for the LiveIndicator.
  let liveStatus: LiveStatus = 'connected';
  if (isExplorerLoading && dataUpdatedAt === 0) {
    liveStatus = 'syncing';
  } else if (isExplorerError) {
    liveStatus = 'disconnected';
  }

  const lastSyncedSeconds = dataUpdatedAt > 0 ? secondsSince(dataUpdatedAt) : undefined;

  const handleBack = () => {
    navigate('/profile');
  };

  return (
    <div className="flex flex-col gap-8 w-full min-h-screen">
      {/* Page header */}
      <PageHeader
        address={blockchainAddress}
        liveStatus={liveStatus}
        lastSyncedSeconds={lastSyncedSeconds}
        onBack={handleBack}
      />

      {/* Address resolving hint */}
      {isResolvingAddress && !blockchainAddress && (
        <div className="px-8 lg:px-14">
          <p className="text-xs text-[var(--text-dark-tertiary,rgba(255,255,255,0.36))]">
            Resolving blockchain address&hellip;
          </p>
        </div>
      )}

      {/* Widget grid */}
      <div className="px-8 lg:px-14 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Column 1: Chain Explorer */}
          <ExplorerCard />

          {/* Column 2: Communities */}
          <CommunitiesCard limit={3} />

          {/* Column 3: Wallet */}
          <WalletCard address={blockchainAddress} email={email} />
        </div>
      </div>

      {/* Footer: link to full Kreivo Dashboard */}
      <div className="px-8 lg:px-14 pb-10 mt-auto">
        <div className="flex items-center justify-between border-t border-[var(--base-border,#3d3d3d)] pt-6">
          <p className="text-xs text-[var(--text-dark-tertiary,rgba(255,255,255,0.36))]">
            Data sourced from the Kreivo chain via Abako proxy.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://kreivo.io', '_blank', 'noopener,noreferrer')}
          >
            <i className="ri-external-link-line mr-1.5" aria-hidden="true" />
            Open Kreivo Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
