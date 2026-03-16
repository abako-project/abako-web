/**
 * usePaymentStatus - Query escrow state from the Payments pallet
 *
 * Polls the payment status at a regular interval so the UI
 * can react to state transitions (e.g. released → claimable).
 */

import { useQuery } from '@tanstack/react-query';
import { getPayment } from '@/api/virto/payments';
import type { PaymentInfo } from '@/api/virto/types';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const paymentStatusKeys = {
  all: ['payment-status'] as const,
  detail: (paymentId: string) => [...paymentStatusKeys.all, paymentId] as const,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UsePaymentStatusResult {
  data: PaymentInfo | null | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Queries the on-chain payment state by paymentId.
 * Returns `null` when the payment doesn't exist, `undefined` while loading.
 *
 * @param paymentId - Payment ID from escrow creation. Disabled when falsy.
 */
export function usePaymentStatus(paymentId: string | undefined): UsePaymentStatusResult {
  const enabled = Boolean(paymentId && paymentId.trim().length > 0);

  const query = useQuery<PaymentInfo | null, Error>({
    queryKey: paymentStatusKeys.detail(paymentId ?? ''),
    queryFn: async (): Promise<PaymentInfo | null> => {
      if (!paymentId) throw new Error('Payment ID is required');
      return getPayment(paymentId);
    },
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 2,
    retryDelay: 2_000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading && enabled,
    isError: query.isError,
    error: query.error,
  };
}

// ---------------------------------------------------------------------------
// Helper: Get paymentId from localStorage
// ---------------------------------------------------------------------------

/**
 * Retrieve the stored paymentId for a project (set during escrow creation).
 */
export function getStoredPaymentId(projectId: string): string | null {
  try {
    return localStorage.getItem(`escrow-paymentId-${projectId}`);
  } catch {
    return null;
  }
}
