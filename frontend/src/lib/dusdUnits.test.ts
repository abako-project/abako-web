import { describe, it, expect, vi } from 'vitest';

// The module-under-test imports DECIMALS from @/api/kreivo/rpc at the top level.
// We mock the whole module so the constant is available without spinning up the
// Polkadot/Kreivo RPC stack in the test environment.
vi.mock('@/api/kreivo/rpc', () => ({
  DECIMALS: { KSM: 12, DUSD: 3 },
}));

import { dusdToPlanck, planckToDusd, parseBudget, budgetPlanckToHuman } from './dusdUnits';

describe('dusdToPlanck', () => {
  it('converts human-readable DUSD to planck', () => {
    expect(dusdToPlanck(15000)).toBe(15000000);
  });

  it('converts small amounts correctly', () => {
    expect(dusdToPlanck(1)).toBe(1000);
  });

  it('converts fractional DUSD to planck', () => {
    expect(dusdToPlanck(0.001)).toBe(1);
  });

  it('handles zero', () => {
    expect(dusdToPlanck(0)).toBe(0);
  });

  it('returns 0 for NaN', () => {
    expect(dusdToPlanck(NaN)).toBe(0);
  });

  it('returns 0 for Infinity', () => {
    expect(dusdToPlanck(Infinity)).toBe(0);
  });

  it('returns 0 for -Infinity', () => {
    expect(dusdToPlanck(-Infinity)).toBe(0);
  });

  it('handles negative amounts', () => {
    expect(dusdToPlanck(-100)).toBe(-100000);
  });
});

describe('planckToDusd', () => {
  it('converts planck to human-readable DUSD', () => {
    expect(planckToDusd(15000000)).toBe(15000);
  });

  it('converts small planck amounts', () => {
    expect(planckToDusd(1)).toBe(0.001);
  });

  it('handles zero', () => {
    expect(planckToDusd(0)).toBe(0);
  });

  it('returns 0 for NaN', () => {
    expect(planckToDusd(NaN)).toBe(0);
  });

  it('returns 0 for Infinity', () => {
    expect(planckToDusd(Infinity)).toBe(0);
  });
});

describe('parseBudget', () => {
  it('parses numeric budget', () => {
    expect(parseBudget(15000)).toBe(15000);
  });

  it('parses string budget', () => {
    expect(parseBudget('15000')).toBe(15000);
  });

  it('parses float string budget', () => {
    expect(parseBudget('15000.5')).toBe(15000.5);
  });

  it('returns 0 for null', () => {
    expect(parseBudget(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(parseBudget(undefined)).toBe(0);
  });

  it('returns 0 for NaN string', () => {
    expect(parseBudget('not-a-number')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parseBudget('')).toBe(0);
  });

  it('handles zero', () => {
    expect(parseBudget(0)).toBe(0);
  });
});

describe('budgetPlanckToHuman', () => {
  it('extracts and converts planck budget to human-readable', () => {
    expect(budgetPlanckToHuman(15000000)).toBe(15000);
  });

  it('handles string planck budget', () => {
    expect(budgetPlanckToHuman('15000000')).toBe(15000);
  });

  it('returns 0 for null', () => {
    expect(budgetPlanckToHuman(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(budgetPlanckToHuman(undefined)).toBe(0);
  });

  it('round-trips with dusdToPlanck', () => {
    const original = 15000;
    const planck = dusdToPlanck(original);
    expect(budgetPlanckToHuman(planck)).toBe(original);
  });
});
