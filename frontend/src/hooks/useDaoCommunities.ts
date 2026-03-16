/**
 * useDaoCommunities - TanStack Query hook for the CommunitiesCard widget.
 *
 * Uses the existing Virto memberships API (already in the codebase) to
 * fetch community data. No new backend endpoints needed.
 *
 * Currently queries community ID '1' (Abako), which is the main
 * community on the Kreivo chain. When more communities are available,
 * this can be extended to query multiple community IDs.
 *
 * Returned shape (CommunitiesData):
 *   communities  - array of Community objects (up to `limit`)
 *   totalCount   - total number of communities (for "N more…" label)
 */

import { useQuery } from '@tanstack/react-query';
import { getMembers } from '@/api/virto/memberships';
import type { CommunitiesData, Community } from '@/types/dao';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Known community IDs on the Kreivo chain.
 * Community '1' is Abako (from chain_spec.json genesis).
 * Additional communities can be added here as they are created.
 */
const KNOWN_COMMUNITIES: Array<{ id: string; name: string }> = [
  { id: '1', name: 'Abako' },
  { id: '2', name: 'Virto Network' },
  { id: '3', name: 'Kreivo DAO' },
];

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const communitiesKeys = {
  all: ['dao', 'communities'] as const,
  list: (limit: number) => [...communitiesKeys.all, 'list', limit] as const,
};

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchCommunities(limit: number): Promise<CommunitiesData> {
  const communities: Community[] = [];

  // Query each known community for its member list
  const results = await Promise.allSettled(
    KNOWN_COMMUNITIES.map(async (community, index) => {
      try {
        const membersResponse = await getMembers(community.id, 1, 1);
        const memberCount =
          typeof membersResponse === 'object' && membersResponse !== null
            ? (membersResponse as { total?: number; members?: unknown[] }).total ??
              (membersResponse as { members?: unknown[] }).members?.length ??
              0
            : 0;

        return {
          id: community.id,
          name: community.name,
          memberCount,
          status: memberCount > 0 ? 'active' : 'inactive',
          gradientIndex: index,
        } satisfies Community;
      } catch {
        // Community may not exist on-chain; skip it
        return null;
      }
    }),
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      communities.push(result.value);
    }
  }

  const totalCount = communities.length;
  const limited = communities.slice(0, limit);

  return { communities: limited, totalCount };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseDaoCommunitiesResult {
  data: CommunitiesData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Fetches up to `limit` Kreivo communities via the Virto memberships API.
 *
 * @param limit - Maximum number of communities to return (default 3).
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useDaoCommunities(3);
 * ```
 */
export function useDaoCommunities(limit = 3): UseDaoCommunitiesResult {
  const query = useQuery<CommunitiesData, Error>({
    queryKey: communitiesKeys.list(limit),
    queryFn: () => fetchCommunities(limit),
    staleTime: 5 * 60 * 1_000, // communities change rarely; cache 5 min
    retry: 2,
    retryDelay: 1_500,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
