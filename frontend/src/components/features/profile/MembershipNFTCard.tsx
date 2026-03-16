/**
 * MembershipNFTCard - Abako Community Membership NFT Badge
 *
 * Displays a developer's on-chain community membership as a stylized NFT card.
 * Only renders when isMember === true; callers should guard with that condition.
 *
 * Design: dark surface, green gradient glow, membership ID badge, join date,
 * truncated blockchain address, and a "Verified" indicator.
 * Matches the existing profile page dark theme and design tokens.
 */

import { useState, useCallback } from 'react';
import { Badge } from '@components/ui/Badge';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats an ISO date string to a human-readable form.
 * Falls back gracefully if the date is null or unparseable.
 */
function formatJoinDate(isoDate: string | null): string {
  if (!isoDate) return 'Unknown';
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

// ---------------------------------------------------------------------------
// Sub-component: NFT Visual
// ---------------------------------------------------------------------------

/** Decorative gradient artwork representing the NFT token. */
function NFTVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative w-[72px] h-[72px] rounded-[var(--radi-6,12px)] flex-shrink-0 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #059467 0%, #36d399 60%, #85efac 100%)',
        boxShadow: '0 0 24px 4px rgba(54,211,153,0.35), 0 0 6px 1px rgba(54,211,153,0.2)',
      }}
    >
      {/* Hexagonal watermark pattern */}
      <svg
        viewBox="0 0 72 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full opacity-20"
      >
        <polygon
          points="36,4 64,20 64,52 36,68 8,52 8,20"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="1.5"
          fill="none"
        />
        <polygon
          points="36,14 56,26 56,46 36,58 16,46 16,26"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1"
          fill="none"
        />
      </svg>

      {/* Abako monogram */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-white font-bold leading-none select-none"
          style={{ fontSize: '11px', letterSpacing: '-0.3px', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
        >
          Abako
        </span>
      </div>

      {/* Shine overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.18) 0%, transparent 55%)',
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Copyable Address
// ---------------------------------------------------------------------------

function CopyableAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [address]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs font-mono leading-[18px] text-[var(--text-dark-tertiary,rgba(255,255,255,0.36))] hover:text-[var(--text-dark-secondary,rgba(255,255,255,0.7))] transition-colors cursor-pointer"
      title="Click to copy address"
    >
      <i className={`${copied ? 'ri-check-line text-[var(--state-brand-active,#36d399)]' : 'ri-fingerprint-line'} text-sm leading-none`} />
      <span className="break-all">{address}</span>
      {copied && (
        <span className="text-[11px] text-[var(--state-brand-active,#36d399)] whitespace-nowrap">Copied!</span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MembershipNFTCardProps {
  /** On-chain membership token ID. */
  membershipId: string | null;
  /** ISO date string of when the developer joined the community. */
  joinedAt: string | null;
  /** The developer's blockchain address. */
  address: string;
  /** Optional additional class names. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a compact NFT card for the developer's Abako community membership.
 *
 * @example
 * ```tsx
 * {membership.isMember && (
 *   <MembershipNFTCard
 *     membershipId={membership.membershipId}
 *     joinedAt={membership.joinedAt}
 *     address={developer.developerWorkerAddress ?? ''}
 *   />
 * )}
 * ```
 */
export function MembershipNFTCard({
  membershipId,
  joinedAt,
  address,
  className = '',
}: MembershipNFTCardProps) {
  return (
    <div
      className={`
        relative flex items-center gap-4 px-5 py-4
        bg-[var(--base-surface-1,#141414)]
        border border-[var(--base-border,#3d3d3d)]
        rounded-[var(--radi-7,16px)]
        shadow-[0.5px_0.5px_3px_0px_rgba(255,255,255,0.08)]
        overflow-hidden
        ${className}
      `}
    >
      {/* Subtle green ambient glow behind the card */}
      <div
        aria-hidden="true"
        className="absolute -top-10 -left-10 w-40 h-40 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(54,211,153,0.10) 0%, transparent 70%)',
        }}
      />

      {/* NFT Artwork */}
      <NFTVisual />

      {/* Content */}
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        {/* Title row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold leading-[22px] text-[var(--text-dark-primary,#f5f5f5)]">
            Community Member
          </span>

          {/* Verified badge */}
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold leading-none"
            style={{
              background: 'rgba(54,211,153,0.15)',
              color: '#36d399',
              border: '1px solid rgba(54,211,153,0.30)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: '#36d399', boxShadow: '0 0 4px #36d399' }}
            />
            Verified
          </span>
        </div>

        {/* Membership ID */}
        {membershipId !== null && (
          <Badge
            variant="neutral"
            className="self-start text-xs font-mono h-6 px-2"
          >
            #{membershipId}
          </Badge>
        )}

        {/* Meta row: join date + address */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-0.5">
          {/* Join date */}
          <span className="flex items-center gap-1.5 text-xs leading-[18px] text-[var(--text-dark-tertiary,rgba(255,255,255,0.36))]">
            <i className="ri-calendar-line text-sm leading-none" />
            Joined {formatJoinDate(joinedAt)}
          </span>

          {/* Full address - click to copy */}
          {address && (
            <CopyableAddress address={address} />
          )}
        </div>
      </div>

      {/* Right decoration: Abako label */}
      <div
        className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0"
        aria-hidden="true"
      >
        <span
          className="text-[10px] font-bold uppercase tracking-widest leading-none"
          style={{ color: 'rgba(54,211,153,0.5)' }}
        >
          Abako
        </span>
        <span
          className="text-[10px] font-medium leading-none"
          style={{ color: 'rgba(255,255,255,0.2)' }}
        >
          NFT Membership
        </span>
      </div>
    </div>
  );
}
