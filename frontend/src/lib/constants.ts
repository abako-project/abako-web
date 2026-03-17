/**
 * Shared application-level constants.
 *
 * Single source of truth for values used across multiple modules.
 * Where noted, values are business-defined defaults that should eventually
 * become user-configurable per project.
 */

/**
 * Default advance payment percentage for escrow deposits.
 *
 * Represents what fraction of the total milestone budget is deposited into
 * escrow upfront when a scope is submitted. A value of 100 means 100% of the
 * total budget is locked in escrow before work begins.
 *
 * TODO: Make this user-configurable per project (project settings screen).
 * Both useScope.ts and usePayments.ts must use this constant to stay in sync.
 */
export const DEFAULT_ADVANCE_PAYMENT_PERCENTAGE = 100;
