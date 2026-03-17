/**
 * Milestone Workflow Hooks
 *
 * React Query mutation hooks for milestone lifecycle operations.
 * All hooks use direct service calls (no Express backend).
 *
 * These hooks invalidate the project detail and dashboard queries
 * on success so the UI stays in sync after workflow transitions.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectKeys } from '@hooks/useProjects';
import {
  submitMilestoneForReview,
  acceptMilestoneSubmission,
  rejectMilestoneSubmission,
  updateMilestone,
  destroyMilestone,
} from '@/services';
// Note: apiUpdateMilestone from '@/api/adapter' is available but not currently
// used in useSubmitMilestone because the backend does not accept documentation/links fields.
import type { MilestoneFormData } from '@/types';
import { useAuthStore } from '@/stores/authStore';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface MilestoneActionResponse {
  projectId: string;
  milestoneId: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const milestoneKeys = {
  all: ['milestones'] as const,
  detail: (projectId: string, milestoneId: string) =>
    [...milestoneKeys.all, projectId, milestoneId] as const,
};

// ---------------------------------------------------------------------------
// useSubmitMilestone
// ---------------------------------------------------------------------------

/** Input for the submit milestone mutation. */
export interface SubmitMilestoneInput {
  projectId: string;
  milestoneId: string;
  documentation?: string;
  links?: string;
}

/**
 * Mutation for submitting a milestone for client review.
 *
 * Used by consultants/developers to submit a milestone for client review.
 * Transitions the milestone from MilestoneInProgress to WaitingClientAcceptSubmission.
 *
 * On success, invalidates the project detail and dashboard queries.
 */
export function useSubmitMilestone() {
  const queryClient = useQueryClient();

  return useMutation<MilestoneActionResponse, Error, SubmitMilestoneInput>({
    mutationFn: async ({ projectId, milestoneId }: SubmitMilestoneInput) => {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Authentication token not found');
      // Note: documentation/links fields are not yet supported by the backend
      // milestone update endpoint. When backend adds support, re-enable the
      // apiUpdateMilestone call here.
      await submitMilestoneForReview(projectId, milestoneId, token);
      return {
        projectId,
        milestoneId,
        message: 'Milestone submitted successfully',
      };
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.projectId),
      });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: projectKeys.dashboard() });
    },
  });
}

// ---------------------------------------------------------------------------
// useAcceptMilestone
// ---------------------------------------------------------------------------

/** Input for the accept milestone mutation. */
export interface AcceptMilestoneInput {
  projectId: string;
  milestoneId: string;
  comment?: string;
}

/**
 * Mutation for accepting delivered milestone work.
 *
 * Used by clients to accept delivered milestone work.
 * Transitions the milestone from WaitingClientAcceptSubmission to MilestoneCompleted.
 *
 * On success, invalidates the project detail, list, and dashboard queries.
 */
export function useAcceptMilestone() {
  const queryClient = useQueryClient();

  return useMutation<MilestoneActionResponse, Error, AcceptMilestoneInput>({
    mutationFn: async ({
      projectId,
      milestoneId,
      comment,
    }: AcceptMilestoneInput) => {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Authentication token not found');
      await acceptMilestoneSubmission(projectId, milestoneId, comment || '', token);
      return {
        projectId,
        milestoneId,
        message: 'Milestone accepted successfully',
      };
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.projectId),
      });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: projectKeys.dashboard() });
    },
  });
}

// ---------------------------------------------------------------------------
// useRejectMilestone
// ---------------------------------------------------------------------------

/** Input for the reject milestone mutation. */
export interface RejectMilestoneInput {
  projectId: string;
  milestoneId: string;
  comment?: string;
}

/**
 * Mutation for rejecting delivered milestone work.
 *
 * Used by clients to reject delivered milestone work.
 * Transitions the milestone from WaitingClientAcceptSubmission
 * to SubmissionRejectedByClient.
 *
 * On success, invalidates the project detail, list, and dashboard queries.
 */
export function useRejectMilestone() {
  const queryClient = useQueryClient();

  return useMutation<MilestoneActionResponse, Error, RejectMilestoneInput>({
    mutationFn: async ({
      projectId,
      milestoneId,
      comment,
    }: RejectMilestoneInput) => {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Authentication token not found');
      await rejectMilestoneSubmission(projectId, milestoneId, comment || '', token);
      return {
        projectId,
        milestoneId,
        message: 'Milestone rejected successfully',
      };
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.projectId),
      });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: projectKeys.dashboard() });
    },
  });
}

// ---------------------------------------------------------------------------
// useUpdateMilestone
// ---------------------------------------------------------------------------

/** Input for the update milestone mutation. */
export interface UpdateMilestoneInput {
  projectId: string;
  milestoneId: string;
  data: MilestoneFormData;
}

/**
 * Mutation for updating milestone data.
 *
 * Used by coordinators/developers to update milestone details (title, budget, etc.).
 * On success, invalidates the project detail and dashboard queries.
 */
export function useUpdateMilestone() {
  const queryClient = useQueryClient();

  return useMutation<MilestoneActionResponse, Error, UpdateMilestoneInput>({
    mutationFn: async ({ projectId, milestoneId, data }: UpdateMilestoneInput) => {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Authentication token not found');
      await updateMilestone(projectId, milestoneId, data, token);
      return {
        projectId,
        milestoneId,
        message: 'Milestone updated successfully',
      };
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: milestoneKeys.detail(variables.projectId, variables.milestoneId),
      });
      void queryClient.invalidateQueries({ queryKey: projectKeys.dashboard() });
    },
  });
}

// ---------------------------------------------------------------------------
// useDestroyMilestone
// ---------------------------------------------------------------------------

/** Input for the destroy milestone mutation. */
export interface DestroyMilestoneInput {
  projectId: string;
  milestoneId: string;
}

/**
 * Mutation for deleting a milestone.
 *
 * Used by coordinators to remove a milestone from a project.
 * On success, invalidates the project detail and dashboard queries.
 */
export function useDestroyMilestone() {
  const queryClient = useQueryClient();

  return useMutation<MilestoneActionResponse, Error, DestroyMilestoneInput>({
    mutationFn: async ({ projectId, milestoneId }: DestroyMilestoneInput) => {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Authentication token not found');
      await destroyMilestone(projectId, milestoneId, token);
      return {
        projectId,
        milestoneId,
        message: 'Milestone deleted successfully',
      };
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.projectId),
      });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: projectKeys.dashboard() });
    },
  });
}
