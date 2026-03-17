/**
 * Votes Data Hooks
 *
 * React Query hooks for voting/rating flow.
 * All hooks use direct service calls (no Express backend).
 *
 * These hooks manage the voting/rating flow where consultants
 * rate developer performance at the end of a project.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  VOTES_SUBMITTED,
  COORDINATOR_RATINGS_SUBMITTED,
  DEVELOPER_RATING_SUBMITTED,
} from '@/constants/messages';
import { projectKeys } from '@hooks/useProjects';
import { paymentKeys } from '@hooks/usePayments';
import { ratingKeys } from '@hooks/useRatings';
import type {
  VotesResponse,
  VoteEntry,
  SubmitVotesResponse,
  SubmitCoordinatorRatingsInput,
  SubmitCoordinatorRatingsResponse,
  SubmitDeveloperRatingInput,
  SubmitDeveloperRatingResponse,
} from '@/types/index';
import {
  getProject,
  getProjectDevelopers,
  getDeveloperAttachment,
  projectCompleted,
  submitCoordinatorRatings,
  submitDeveloperRating,
} from '@/services';
import { useAuthStore } from '@/stores/authStore';
import { adapterConfig } from '@/api/config';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const voteKeys = {
  all: ['votes'] as const,
  members: (projectId: string) => [...voteKeys.all, 'members', projectId] as const,
};

// ---------------------------------------------------------------------------
// useVoteMembers
// ---------------------------------------------------------------------------

/**
 * Fetches the team members available for rating.
 *
 * @param projectId - The project ID. When undefined, the query is disabled.
 */
export function useVoteMembers(projectId: string | undefined) {
  return useQuery<VotesResponse>({
    queryKey: voteKeys.members(projectId ?? ''),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      const project = await getProject(projectId);
      const members = await getProjectDevelopers(projectId);

      // Enrich members with image URLs
      const enrichedMembers = await Promise.all(
        members.map(async (member) => {
          let imageUrl = '/images/none.png';
          try {
            const attachment = await getDeveloperAttachment(member.id);
            if (attachment) {
              imageUrl = `${adapterConfig.baseURL}/developers/${member.id}/attachment`;
            }
          } catch {
            // Keep default image if attachment fetch fails
          }

          return {
            name: member.name,
            role: member.role || null,
            proficiency: member.proficiency || null,
            userId: member.developerWorkerAddress || null,
            email: member.email || null,
            imageUrl,
          };
        })
      );

      return {
        project: {
          id: project.id,
          title: project.title,
          state: project.state || 'Unknown',
        },
        members: enrichedMembers,
      };
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ---------------------------------------------------------------------------
// useSubmitVotes
// ---------------------------------------------------------------------------

/** Input for the submit votes mutation. */
export interface SubmitVotesInput {
  projectId: string;
  votes: VoteEntry[];
  coordinatorRating: number;
}

/**
 * Mutation for submitting developer ratings.
 *
 * Submits developer ratings and marks the project as completed.
 * On success, invalidates relevant queries.
 */
export function useSubmitVotes() {
  const queryClient = useQueryClient();

  return useMutation<SubmitVotesResponse, Error, SubmitVotesInput>({
    mutationFn: async ({ projectId, votes, coordinatorRating }: SubmitVotesInput) => {
      const token = useAuthStore.getState().token || '';

      // Convert votes to the format expected by the service
      // Ensure scores are numeric (form inputs may produce strings at runtime)
      const voteTuples: Array<[string, number]> = votes.map((v) => [v.userId, Number(v.score)]);

      await projectCompleted(projectId, voteTuples, coordinatorRating, token);

      return {
        projectId,
        message: VOTES_SUBMITTED,
      };
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: voteKeys.members(variables.projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.projectId),
      });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: projectKeys.dashboard() });
      void queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: ratingKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// useSubmitCoordinatorRatings
// ---------------------------------------------------------------------------

/**
 * Mutation for submitting coordinator ratings (coordinator rates client + team).
 *
 * On success, invalidates project and vote queries.
 */
export function useSubmitCoordinatorRatings() {
  const queryClient = useQueryClient();

  return useMutation<SubmitCoordinatorRatingsResponse, Error, SubmitCoordinatorRatingsInput>({
    mutationFn: async ({ projectId, clientRating, teamRatings }: SubmitCoordinatorRatingsInput) => {
      const token = useAuthStore.getState().token || '';

      await submitCoordinatorRatings(projectId, clientRating, teamRatings, token);

      return {
        projectId,
        message: COORDINATOR_RATINGS_SUBMITTED,
      };
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: voteKeys.members(variables.projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.projectId),
      });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: projectKeys.dashboard() });
      void queryClient.invalidateQueries({ queryKey: ratingKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// useSubmitDeveloperRating
// ---------------------------------------------------------------------------

/**
 * Mutation for submitting developer rating (developer rates coordinator).
 *
 * On success, invalidates project queries.
 */
export function useSubmitDeveloperRating() {
  const queryClient = useQueryClient();

  return useMutation<SubmitDeveloperRatingResponse, Error, SubmitDeveloperRatingInput>({
    mutationFn: async ({ projectId, coordinatorRating }: SubmitDeveloperRatingInput) => {
      const token = useAuthStore.getState().token || '';

      await submitDeveloperRating(projectId, coordinatorRating, token);

      return {
        projectId,
        message: DEVELOPER_RATING_SUBMITTED,
      };
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.projectId),
      });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: projectKeys.dashboard() });
      void queryClient.invalidateQueries({ queryKey: ratingKeys.all });
    },
  });
}
