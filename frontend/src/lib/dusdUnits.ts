/**
 * DUSD Unit Conversion Utilities
 *
 * DUSD stablecoin has 3 decimal places on the Kreivo chain.
 * 1 human-readable DUSD = 1000 planck (smallest on-chain unit).
 *
 * These helpers convert between human-readable and planck representations.
 * All functions handle edge cases: null, undefined, NaN, string inputs.
 */

import { DECIMALS } from '@/api/kreivo/rpc';

/** The multiplier: 10^DECIMALS.DUSD = 1000 for DUSD with 3 decimals. */
const DUSD_MULTIPLIER = 10 ** DECIMALS.DUSD;

/**
 * Convert human-readable DUSD to planck (smallest on-chain unit).
 * Example: 15000 DUSD -> 15000000 planck (with 3 decimals).
 *
 * @param humanReadable - Amount in human-readable DUSD (e.g., 15000)
 * @returns Amount in planck as an integer, or 0 if input is invalid.
 */
export function dusdToPlanck(humanReadable: number): number {
  if (!Number.isFinite(humanReadable)) return 0;
  return Math.round(humanReadable * DUSD_MULTIPLIER);
}

/**
 * Convert planck to human-readable DUSD.
 * Example: 15000000 planck -> 15000 DUSD (with 3 decimals).
 *
 * @param planck - Amount in planck (smallest unit)
 * @returns Amount in human-readable DUSD, or 0 if input is invalid.
 */
export function planckToDusd(planck: number): number {
  if (!Number.isFinite(planck)) return 0;
  return planck / DUSD_MULTIPLIER;
}

/**
 * Safely extract a numeric value from a milestone budget field.
 *
 * Handles: string, number, null, undefined, NaN.
 * Centralizes the getMilestoneBudget helper that was duplicated
 * across paymentUtils.ts, ScopeReviewPage.tsx, and PaymentFundPage.tsx.
 *
 * @param budget - The raw budget value from a Milestone object
 * @returns Numeric budget, or 0 if invalid.
 */
export function parseBudget(budget: string | number | null | undefined): number {
  if (budget === null || budget === undefined) return 0;
  const val = typeof budget === 'string' ? parseFloat(budget) : budget;
  return isNaN(val) ? 0 : val;
}

/**
 * Convert a planck budget value to human-readable DUSD for display.
 *
 * When budgets come back from the API, they are stored in planck.
 * This function extracts the number and divides by the multiplier.
 *
 * @param budget - Raw budget from milestone (in planck)
 * @returns Human-readable DUSD amount
 */
export function budgetPlanckToHuman(budget: string | number | null | undefined): number {
  return planckToDusd(parseBudget(budget));
}
