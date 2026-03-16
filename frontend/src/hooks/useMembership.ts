/**
 * useMembershipNFT - React Query hook for Abako community membership
 *
 * Resolves a developer's blockchain address from their email, then checks
 * whether that address holds a community membership NFT.
 *
 * Flow:
 *   1. Call getUserAddress(email) to resolve blockchain address
 *   2. Call checkMembership('1', address) to verify membership status
 *   3. If isMember === true, call getMember('1', membershipId) for details
 *   4. Return combined result with loading state
 *
 * Community ID '1' is the Abako community (from chain_spec.json genesis).
 */

import { useQuery } from '@tanstack/react-query';
import { getUserAddress } from '@/api/virto';
import { checkMembership, getMember } from '@/api/virto/memberships';
import type { CheckMembershipResponse, GetMemberResponse, GetUserAddressResponse } from '@/api/virto/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The Abako community ID as defined in chain_spec.json genesis config. */
const COMMUNITY_ID = '1';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const membershipKeys = {
  all: ['memberships'] as const,
  address: (email: string) => [...membershipKeys.all, 'address', email] as const,
  check: (address: string) => [...membershipKeys.all, 'check', address] as const,
  detail: (communityId: string, membershipId: string) =>
    [...membershipKeys.all, 'detail', communityId, membershipId] as const,
};

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface MembershipNFTData {
  /** Whether the address holds a community membership. */
  isMember: boolean;
  /** On-chain membership token ID, present when isMember is true. */
  membershipId: string | null;
  /** ISO timestamp of when the address joined the community. */
  joinedAt: string | null;
  /** The blockchain address that was checked. */
  address: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetches the Abako community membership NFT status for a developer.
 *
 * The hook runs three sequential queries:
 *   - Query 1: getUserAddress to resolve blockchain address from email
 *   - Query 2: checkMembership to determine isMember and membershipId
 *   - Query 3: getMember for joinedAt details (only when isMember is true)
 *
 * @param email - The developer's email (used as userId to resolve blockchain address)
 */
export function useMembershipNFT(email: string | undefined): {
  data: MembershipNFTData | null;
  isLoading: boolean;
  isError: boolean;
} {
  const hasEmail = Boolean(email && email.trim().length > 0);

  // Query 1: resolve blockchain address from email
  const addressQuery = useQuery<GetUserAddressResponse>({
    queryKey: membershipKeys.address(email ?? ''),
    queryFn: async () => {
      if (!email) throw new Error('Email is required');
      return getUserAddress(email);
    },
    enabled: hasEmail,
    staleTime: 10 * 60 * 1000, // 10 minutes - address never changes
    retry: 1,
  });

  const blockchainAddress = addressQuery.data?.address ?? null;

  // Query 2: check membership status
  const checkQuery = useQuery<CheckMembershipResponse>({
    queryKey: membershipKeys.check(blockchainAddress ?? ''),
    queryFn: async () => {
      if (!blockchainAddress) throw new Error('Blockchain address is required');
      return checkMembership(COMMUNITY_ID, blockchainAddress);
    },
    enabled: hasEmail && blockchainAddress !== null,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const membershipId = checkQuery.data?.membershipId ?? null;
  const isMember = checkQuery.data?.isMember ?? false;

  // Query 3: fetch member details (only when membership is confirmed)
  const detailQuery = useQuery<GetMemberResponse>({
    queryKey: membershipKeys.detail(COMMUNITY_ID, membershipId ?? ''),
    queryFn: async () => {
      if (!membershipId) throw new Error('Membership ID is required');
      return getMember(COMMUNITY_ID, membershipId);
    },
    enabled: hasEmail && isMember && membershipId !== null,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Derive combined loading state
  const isLoading =
    (hasEmail && addressQuery.isLoading) ||
    (blockchainAddress !== null && checkQuery.isLoading) ||
    (isMember && membershipId !== null && detailQuery.isLoading);

  const isError = addressQuery.isError || checkQuery.isError || detailQuery.isError;

  // Build combined result
  if (!checkQuery.data || !isMember) {
    return {
      data: checkQuery.data
        ? { isMember: false, membershipId: null, joinedAt: null, address: blockchainAddress ?? '' }
        : null,
      isLoading,
      isError,
    };
  }

  return {
    data: {
      isMember: true,
      membershipId,
      joinedAt: detailQuery.data?.joinedAt ?? null,
      address: blockchainAddress ?? '',
    },
    isLoading,
    isError,
  };
}
