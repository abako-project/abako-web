/**
 * Scope and Proposal Action Hooks
 *
 * React Query mutation hooks for project lifecycle actions.
 * All hooks use direct service calls (no Express backend).
 *
 * Proposal-level approve/reject mutations live in useProjects.ts
 * (useApproveProposal, useRejectProposal) and are re-exported here
 * for convenience.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectKeys } from '@hooks/useProjects';
import type { Milestone } from '@/types/index';
import {
  submitScope,
  acceptScope,
  rejectScope,
} from '@/services';
import { getAllTasks, updateProject } from '@/api/adapter';
import { useAuthStore } from '@/stores/authStore';
import { dusdToPlanck, parseBudget, planckToDusd } from '@lib/dusdUnits';
import { computeScopeHash } from '@lib/scopeHash';
import { DEFAULT_ADVANCE_PAYMENT_PERCENTAGE } from '@lib/constants';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface ScopeActionResponse {
  projectId: string;
  message: string;
}

// ---------------------------------------------------------------------------
// useSubmitScope
// ---------------------------------------------------------------------------

/** Input for the submit scope mutation. */
export interface SubmitScopeInput {
  projectId: string;
  milestones: Milestone[];
  consultantComment?: string;
}

/**
 * Mutation for submitting the scope (milestones) for client validation.
 *
 * Used by consultants to submit the scope (milestones) for client validation.
 * The milestones are sent directly in the request body rather than being
 * stored in the session, which is the React SPA approach.
 *
 * On success, invalidates the project detail and list queries.
 */
export function useSubmitScope() {
  const queryClient = useQueryClient();

  return useMutation<ScopeActionResponse, Error, SubmitScopeInput>({
    mutationFn: async ({
      projectId,
      milestones,
      consultantComment,
    }: SubmitScopeInput) => {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Authentication token not found');

      // Convert milestone budgets from human-readable DUSD to planck.
      // The adapter stores these values and uses them directly for on-chain escrow.
      const milestonesWithPlanckBudgets = milestones.map((m) => ({
        ...m,
        budget: m.budget !== null && m.budget !== undefined
          ? dusdToPlanck(parseBudget(m.budget))
          : m.budget,
      }));

      const milestonesData = milestonesWithPlanckBudgets as unknown as Record<string, unknown>[];

      // Compute a deterministic SHA-256 hash of the milestone data to use as
      // on-chain proof of the scope document. Replaces the previous hardcoded
      // placeholder so the hash actually reflects the agreed milestones.
      // Map null budget values to undefined so the type matches computeScopeHash's
      // parameter shape (which does not accept null).
      const documentHash = await computeScopeHash(
        milestones.map((m) => ({
          ...m,
          budget: m.budget ?? undefined,
        }))
      );

      await submitScope(
        projectId,
        milestonesData,
        DEFAULT_ADVANCE_PAYMENT_PERCENTAGE,
        documentHash,
        consultantComment || '',
        token
      );

      return {
        projectId,
        message: 'Scope submitted successfully',
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
// useAcceptScope
// ---------------------------------------------------------------------------

/** Input for the accept scope mutation. */
export interface AcceptScopeInput {
  projectId: string;
  clientResponse?: string;
}

/**
 * Mutation for accepting the proposed scope.
 *
 * Uses the contract's actual task IDs (from get_all_tasks response) instead
 * of MongoDB milestone IDs, because the backend may accumulate stale
 * milestones from previous scope proposals that the contract no longer knows about.
 *
 * On success, invalidates the project detail and list queries.
 */
export function useAcceptScope() {
  const queryClient = useQueryClient();

  return useMutation<ScopeActionResponse, Error, AcceptScopeInput>({
    mutationFn: async ({
      projectId,
      clientResponse,
    }: AcceptScopeInput) => {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Authentication token not found');

      // Fetch task IDs from the contract (not MongoDB milestones which may include stale entries)
      const tasksData = await getAllTasks(projectId);
      const contractTasks = (tasksData as Record<string, unknown>).response as Array<{ id: number }> | undefined;
      const taskIds = (contractTasks || [])
        .map((t) => Number(t.id))
        .filter((id) => !isNaN(id));

      if (taskIds.length === 0) {
        throw new Error('No tasks found in the contract to approve');
      }

      // Execute the on-chain accept first. Budget sync must happen AFTER the
      // on-chain operation succeeds so a failed acceptScope does not leave the
      // project.budget out of sync.
      const result = await acceptScope(projectId, taskIds, clientResponse || '', token);

      // Sync project.budget with the actual sum of milestone budgets.
      // Milestone budgets are stored in planck; project.budget is human DUSD.
      const milestones = (tasksData as Record<string, unknown>).milestones as
        Array<{ budget?: string | number | null }> | undefined;
      if (milestones && milestones.length > 0) {
        const totalPlanck = milestones.reduce(
          (sum, m) => sum + parseBudget(m.budget),
          0
        );
        const totalHumanDusd = planckToDusd(totalPlanck);
        await updateProject(projectId, { budget: totalHumanDusd }, token);
      }

      // Try to capture paymentId from the approve_scope response.
      // The adapter may include a paymentId field for on-chain status querying.
      const maybePaymentId = (result as Record<string, unknown>).paymentId;
      if (maybePaymentId && typeof maybePaymentId === 'string') {
        try {
          localStorage.setItem(`escrow-paymentId-${projectId}`, maybePaymentId);
        } catch {
          // localStorage may be unavailable
        }
      }

      return {
        projectId,
        message: 'Scope accepted successfully',
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
// useRejectScope
// ---------------------------------------------------------------------------

/** Input for the reject scope mutation. */
export interface RejectScopeInput {
  projectId: string;
  clientResponse?: string;
}

/**
 * Mutation for rejecting the proposed scope.
 *
 * Used by clients to reject the proposed scope. The project will move
 * back to ScopingInProgress state so the consultant can revise.
 *
 * On success, invalidates the project detail and list queries.
 */
export function useRejectScope() {
  const queryClient = useQueryClient();

  return useMutation<ScopeActionResponse, Error, RejectScopeInput>({
    mutationFn: async ({
      projectId,
      clientResponse,
    }: RejectScopeInput) => {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Authentication token not found');
      await rejectScope(projectId, clientResponse || '', token);
      return {
        projectId,
        message: 'Scope rejected successfully',
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
