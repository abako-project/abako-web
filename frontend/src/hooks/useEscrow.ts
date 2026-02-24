/**
 * useEscrow - React Query mutation hooks for escrow payment operations
 *
 * Wraps Virto API payment calls (Payments pallet) and automatically
 * invalidates relevant query caches on success.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPayment, releasePayment, acceptAndPay } from '@/api/virto/payments';
import { projectKeys } from '@hooks/useProjects';
import { paymentKeys } from '@hooks/usePayments';
import { dusdBalanceKeys } from '@hooks/useKrvxBalance';
import type { CreatePaymentData, CreatePaymentResponse, ReleasePaymentResponse, AcceptAndPayResponse } from '@/api/virto/types';
import { dusdToPlanck } from '@lib/dusdUnits';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateEscrowInput {
  projectId: string;
  /** Amount in human-readable DUSD (will be converted to planck internally). */
  amount: number;
  recipientAddress: string;
  milestoneId?: string;
}

export interface ReleaseEscrowInput {
  paymentId: string;
  projectId: string;
}

export interface ClaimPaymentInput {
  paymentId: string;
  projectId: string;
}

// ---------------------------------------------------------------------------
// useCreateEscrow
// ---------------------------------------------------------------------------

/**
 * Mutation hook for creating a new escrow payment (Payments.pay).
 *
 * On success, invalidates payment and project caches.
 * Stores the paymentId in localStorage keyed by projectId for later retrieval.
 */
export function useCreateEscrow() {
  const queryClient = useQueryClient();

  return useMutation<CreatePaymentResponse, Error, CreateEscrowInput>({
    mutationFn: async (input: CreateEscrowInput): Promise<CreatePaymentResponse> => {
      const paymentData: CreatePaymentData = {
        amount: String(dusdToPlanck(input.amount)),
        recipientAddress: input.recipientAddress,
        projectId: input.projectId,
        milestoneId: input.milestoneId,
        remark: input.projectId,
      };
      const result = await createPayment(paymentData);

      // Persist paymentId for later retrieval (release/claim flow)
      try {
        localStorage.setItem(`escrow-paymentId-${input.projectId}`, result.paymentId);
      } catch {
        // localStorage may be unavailable
      }

      return result;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: paymentKeys.detail(variables.projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.projectId),
      });
      void queryClient.invalidateQueries({ queryKey: dusdBalanceKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// useReleaseEscrow
// ---------------------------------------------------------------------------

/**
 * Mutation hook for releasing escrow (Payments.release).
 * Called by the client after approving deliverables.
 */
export function useReleaseEscrow() {
  const queryClient = useQueryClient();

  return useMutation<ReleasePaymentResponse, Error, ReleaseEscrowInput>({
    mutationFn: async (input: ReleaseEscrowInput): Promise<ReleasePaymentResponse> => {
      return releasePayment({ paymentId: input.paymentId });
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: paymentKeys.detail(variables.projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.projectId),
      });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: projectKeys.dashboard() });
    },
  });
}

// ---------------------------------------------------------------------------
// useClaimPayment
// ---------------------------------------------------------------------------

/**
 * Mutation hook for claiming payment (Payments.accept_and_pay).
 * Called by the developer after the client releases escrow.
 */
export function useClaimPayment() {
  const queryClient = useQueryClient();

  return useMutation<AcceptAndPayResponse, Error, ClaimPaymentInput>({
    mutationFn: async (input: ClaimPaymentInput): Promise<AcceptAndPayResponse> => {
      return acceptAndPay({ paymentId: input.paymentId });
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: paymentKeys.detail(variables.projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.projectId),
      });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: projectKeys.dashboard() });
      void queryClient.invalidateQueries({ queryKey: dusdBalanceKeys.all });
    },
  });
}
