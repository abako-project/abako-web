/**
 * WalletCard - On-chain wallet balance widget for the DAO View page.
 *
 * Displays:
 *   - Total USD value (large headline number, e.g. "$0.00")
 *   - Summary line: "0.0000 KSM · $0.00 DUSD"
 *   - Expandable breakdown section (KSM amount, DUSD amount, KSM unit price)
 *
 * The card is interactive: clicking anywhere on the summary row expands or
 * collapses the asset breakdown, matching the WalletWidget.tsx behaviour in
 * the original Kreivo dashboard.
 *
 * Design mapping (Kreivo WalletWidget.tsx -> Abako):
 *   .wallet-widget outer box -> Card (bg-card border rounded-lg)
 *   .total-usd large text    -> text-3xl font-bold text-foreground
 *   .summary-row             -> flex row with muted-foreground text-sm
 *   .breakdown row           -> flex row with label/value pairs in Card
 *   expand chevron           -> ri-arrow-down-s-line (remixicon, already used)
 *
 * Loading / Error / Empty states follow the same Abako pattern used in
 * DeveloperProfilePage and CommunitiesCard.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Spinner } from '@components/ui/Spinner';
import { useWalletBalance } from '@hooks/useWalletBalance';
import { DusdOnRampFlow } from '@components/features/dao/KrvxOnRampFlow';
import type { AssetBalance } from '@/types/dao';

// ---------------------------------------------------------------------------
// Sub-component: BreakdownRow
// ---------------------------------------------------------------------------

function BreakdownRow({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--base-border,#3d3d3d)] last:border-b-0">
      <span className="text-xs font-medium text-[var(--text-dark-tertiary,rgba(255,255,255,0.36))]">
        {label}
      </span>
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-sm font-semibold text-[var(--text-dark-primary,#f5f5f5)]">
          {value}
        </span>
        {subValue && (
          <span className="text-xs text-[var(--text-dark-tertiary,rgba(255,255,255,0.36))]">
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: AssetSummary (one-line "amount SYMBOL · $usd USD")
// ---------------------------------------------------------------------------

function AssetSummary({ asset }: { asset: AssetBalance }) {
  return (
    <span className="text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
      {asset.amount} {asset.symbol}
      {asset.usdValue && (
        <>
          {' · '}
          <span className="text-[var(--state-brand-active,#36d399)]">${asset.usdValue} USD</span>
        </>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface WalletCardProps {
  /** Blockchain address (ss58) to query. Hook is disabled when falsy. */
  address: string | undefined | null;
  /** User email for Bramp on-ramp user creation. */
  email?: string | undefined;
  className?: string;
}

/**
 * Renders the wallet balance widget for the DAO View page.
 *
 * @example
 * ```tsx
 * <WalletCard address={developer.workerAddress} />
 * ```
 */
export function WalletCard({ address, email, className = '' }: WalletCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOnRamp, setShowOnRamp] = useState(false);
  const { data, isLoading, isError } = useWalletBalance(address);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // --------------- No-address state (no address available yet) ---------------
  if (!address) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Wallet</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-[var(--base-fill-1,#333)] flex items-center justify-center">
            <i className="ri-wallet-3-line text-xl text-[var(--muted-foreground,#9B9B9B)]" />
          </div>
          <p className="text-sm text-[var(--text-dark-tertiary,rgba(255,255,255,0.36))]">
            No blockchain address found
          </p>
        </CardContent>
      </Card>
    );
  }

  // --------------- Loading state ---------------
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Wallet</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <div className="flex flex-col items-center gap-3">
            <Spinner size="md" />
            <p className="text-sm text-[var(--text-dark-tertiary,rgba(255,255,255,0.36))]">
              Fetching balance…
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // --------------- Error state ---------------
  if (isError || !data) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Wallet</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-red-500/10 flex items-center justify-center">
            <i className="ri-wallet-3-line text-xl text-red-400" />
          </div>
          <p className="text-sm text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] mb-1">
            Could not load balance
          </p>
          <p className="text-xs text-[var(--text-dark-tertiary,rgba(255,255,255,0.36))]">
            Chain node may be unreachable.
          </p>
        </CardContent>
      </Card>
    );
  }

  // --------------- Data state ---------------
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Wallet</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Total USD headline */}
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-[var(--text-dark-tertiary,rgba(255,255,255,0.36))] uppercase tracking-wide">
            Total Balance
          </p>
          <p className="text-3xl font-bold text-[var(--text-dark-primary,#f5f5f5)] leading-none">
            {data.totalUsd}
          </p>
        </div>

        {/* Expandable summary row */}
        <button
          type="button"
          onClick={toggleExpanded}
          className="flex items-center justify-between w-full rounded-lg px-3 py-2.5 bg-[var(--base-fill-1,#333)] hover:bg-[var(--base-fill-2,#3d3d3d)] transition-colors text-left"
          aria-expanded={isExpanded}
          aria-controls="wallet-breakdown"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <AssetSummary asset={data.ksm} />
            <span className="text-[var(--text-dark-tertiary,rgba(255,255,255,0.36))] text-sm">·</span>
            <AssetSummary asset={data.dusd} />
          </div>

          <i
            className={`ri-arrow-down-s-line text-lg text-[var(--text-dark-tertiary,rgba(255,255,255,0.36))] flex-shrink-0 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {/* Buy DUSD button */}
        {email && address && (
          <Button
            variant="outline"
            size="sm"
            className="w-full border-[var(--state-brand-active,#36d399)] text-[var(--state-brand-active,#36d399)] hover:bg-[rgba(54,211,153,0.08)]"
            onClick={() => setShowOnRamp(true)}
          >
            <i className="ri-add-circle-line mr-1.5" aria-hidden="true" />
            Buy DUSD
          </Button>
        )}

        {/* Inline on-ramp flow */}
        {showOnRamp && email && address && (
          <div className="rounded-lg border border-[var(--state-brand-active,#36d399)]/30 bg-[var(--base-fill-1,#333)] p-4">
            <DusdOnRampFlow
              address={address}
              email={email}
              onClose={() => setShowOnRamp(false)}
            />
          </div>
        )}

        {/* Breakdown (collapsible) */}
        {isExpanded && (
          <div
            id="wallet-breakdown"
            className="flex flex-col rounded-lg border border-[var(--base-border,#3d3d3d)] px-4 py-1"
          >
            <BreakdownRow
              label="KSM"
              value={`${data.ksm.amount} KSM`}
              subValue={data.ksm.usdValue ? `$${data.ksm.usdValue}` : undefined}
            />
            <BreakdownRow
              label="DUSD"
              value={`${data.dusd.amount} DUSD`}
              subValue={data.dusd.usdValue ? `$${data.dusd.usdValue}` : undefined}
            />
            {data.ksm.unitPrice && (
              <BreakdownRow
                label="KSM / USD"
                value={`$${data.ksm.unitPrice}`}
              />
            )}
          </div>
        )}

        {/* Address hint */}
        <p className="text-[10px] font-mono text-[var(--text-dark-tertiary,rgba(255,255,255,0.36))] truncate">
          {data.address}
        </p>
      </CardContent>
    </Card>
  );
}
