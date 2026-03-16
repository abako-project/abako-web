/**
 * useDusdBalance - Lightweight DUSD balance check hook
 *
 * Used by the escrow funding flow to verify the client has enough
 * DUSD before funding on-chain escrow payments.
 *
 * DUSD: Asset ID 1 (Here), 3 decimal places on Kreivo chain.
 */

import { useQuery } from '@tanstack/react-query';
import { getBalances, DECIMALS } from '@/api/kreivo';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DusdBalanceData {
  /** Human-readable DUSD balance (e.g. "1500.000"). */
  dusdFree: string;
  /** Raw balance in planck (smallest unit). */
  dusdPlanck: bigint;
  /**
   * Check if the wallet has at least `amount` DUSD (in whole units).
   * Converts `amount` to planck internally for precise comparison.
   */
  hasSufficientFunds: (amount: number) => boolean;
}

export interface UseDusdBalanceResult {
  data: DusdBalanceData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Query key
// ---------------------------------------------------------------------------

export const dusdBalanceKeys = {
  all: ['dusd-balance'] as const,
  balance: (address: string) => [...dusdBalanceKeys.all, address] as const,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetches the DUSD balance for the given SS58 address.
 * Disabled when `address` is falsy.
 *
 * @param address - SS58 blockchain address
 */
export function useDusdBalance(address: string | undefined | null): UseDusdBalanceResult {
  const enabled = Boolean(address && address.trim().length > 0);

  const query = useQuery<DusdBalanceData, Error>({
    queryKey: dusdBalanceKeys.balance(address ?? ''),
    queryFn: async (): Promise<DusdBalanceData> => {
      if (!address) throw new Error('Address is required');

      const balances = await getBalances(address);
      const dusdPlanck = balances.dusdPlanck;
      const dusdFree = balances.dusdFree;

      return {
        dusdFree,
        dusdPlanck,
        hasSufficientFunds: (amount: number): boolean => {
          const requiredPlanck = BigInt(Math.ceil(amount)) * 10n ** BigInt(DECIMALS.DUSD);
          return dusdPlanck >= requiredPlanck;
        },
      };
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
