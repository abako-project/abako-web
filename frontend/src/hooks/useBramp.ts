/**
 * useBramp - React Query hooks for the Bramp on/off-ramp service
 *
 * Provides hooks for user management, deposit requests, deposit confirmation,
 * and withdrawal (stubbed for future use).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createBrampUser,
  getBrampUserByEmail,
  requestDeposit,
  confirmDeposit,
  createWithdrawal,
} from '@/api/adapter';
import type {
  BrampUser,
  DepositResponse,
  ConfirmDepositResponse,
  WithdrawalResponse,
} from '@/api/adapter';
import { dusdBalanceKeys } from '@hooks/useKrvxBalance';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const brampKeys = {
  all: ['bramp'] as const,
  users: () => [...brampKeys.all, 'user'] as const,
  user: (email: string) => [...brampKeys.users(), email] as const,
};

// ---------------------------------------------------------------------------
// useBrampUser - Gets or creates a Bramp user by email
// ---------------------------------------------------------------------------

export interface UseBrampUserResult {
  data: BrampUser | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Fetches (or creates) a Bramp user by email.
 * Tries GET first; if user doesn't exist, falls back to POST to create.
 *
 * @param email - User email. Query disabled when falsy.
 */
export function useBrampUser(email: string | undefined | null): UseBrampUserResult {
  const enabled = Boolean(email && email.trim().length > 0);

  const query = useQuery<BrampUser, Error>({
    queryKey: brampKeys.user(email ?? ''),
    queryFn: async (): Promise<BrampUser> => {
      if (!email) throw new Error('Email is required');

      // Try to get existing user first.
      // Backend returns null (200 with empty body) when user not found,
      // so we check for a falsy response instead of relying on a thrown error.
      try {
        const existing = await getBrampUserByEmail(email);
        if (existing && existing.id) return existing;
      } catch {
        // 4xx/5xx — fall through to create
      }

      // User doesn't exist yet — create them
      return await createBrampUser(email);
    },
    enabled,
    staleTime: 5 * 60_000, // 5 minutes — user data rarely changes
    retry: 1,
  });

  return {
    data: query.data,
    isLoading: query.isLoading && enabled,
    isError: query.isError,
    error: query.error,
  };
}

// ---------------------------------------------------------------------------
// useRequestDeposit - Mutation to start a bank transfer deposit
// ---------------------------------------------------------------------------

export interface RequestDepositInput {
  userId: number;
  amount: string;
  toAddress: string;
}

/**
 * Mutation that requests a deposit (on-ramp).
 * Returns bank transfer instructions (IBAN, reference, amount).
 */
export function useRequestDeposit() {
  return useMutation<DepositResponse, Error, RequestDepositInput>({
    mutationFn: async ({ userId, amount, toAddress }: RequestDepositInput): Promise<DepositResponse> => {
      return requestDeposit(userId, amount, toAddress);
    },
  });
}

// ---------------------------------------------------------------------------
// useConfirmDeposit - Mutation to confirm deposit → triggers mint
// ---------------------------------------------------------------------------

export interface ConfirmDepositInput {
  depositId: number;
  toAddress: string;
}

/**
 * Mutation that confirms a deposit and triggers DUSD minting.
 * Invalidates DUSD balance queries on success so the UI updates.
 */
export function useConfirmDeposit() {
  const queryClient = useQueryClient();

  return useMutation<ConfirmDepositResponse, Error, ConfirmDepositInput>({
    mutationFn: async ({ depositId, toAddress }: ConfirmDepositInput): Promise<ConfirmDepositResponse> => {
      return confirmDeposit(depositId, toAddress);
    },
    onSuccess: () => {
      // Invalidate DUSD balance queries so the wallet shows updated balance
      void queryClient.invalidateQueries({ queryKey: dusdBalanceKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// useCreateWithdrawal - Mutation stub for off-ramp (future)
// ---------------------------------------------------------------------------

export interface CreateWithdrawalInput {
  userId: number;
  amount: string;
}

/**
 * Mutation for creating a withdrawal (off-ramp).
 * Stubbed for future use — the backend endpoint exists but the flow isn't built yet.
 */
export function useCreateWithdrawal() {
  return useMutation<WithdrawalResponse, Error, CreateWithdrawalInput>({
    mutationFn: async ({ userId, amount }: CreateWithdrawalInput): Promise<WithdrawalResponse> => {
      return createWithdrawal(userId, amount);
    },
  });
}
