/**
 * Bramp On/Off-Ramp API
 *
 * Typed API client for the Bramp fiat→crypto ramp service.
 * Proxied through the adapter API (NestJS), which handles Bramp authentication.
 *
 * Flow: createUser → requestDeposit → (user sends bank transfer) → confirmDeposit → Assets.mint
 */

import { adapterClient, handleApiError } from './client';
import { adapterConfig } from '../config';

// ---------------------------------------------------------------------------
// Types (aligned with backend ramps/types.ts)
// ---------------------------------------------------------------------------

export interface BrampUser {
  id: number;
  email: string;
  balance: string;
  depositAddress?: {
    address: string;
    derivationIndex: number;
  };
}

export interface DepositResponse {
  message: string;
  depositId: number;
  instructions: {
    amount: string;
    bankAccount: string;
    reference: string;
  };
}

export interface ConfirmDepositResponse {
  status: string;
  txHash: string;
}

export interface WithdrawalResponse {
  message: string;
  withdrawalId: number;
  depositAddress: string;
  amount: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Create a new Bramp user (or retrieve existing by email).
 */
export async function createBrampUser(email: string): Promise<BrampUser> {
  try {
    const response = await adapterClient.post<BrampUser>(
      adapterConfig.endpoints.bramp.createUser,
      { email }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `createBrampUser(${email})`);
  }
}

/**
 * Get a Bramp user by email address.
 */
export async function getBrampUserByEmail(email: string): Promise<BrampUser> {
  try {
    const response = await adapterClient.get<BrampUser>(
      adapterConfig.endpoints.bramp.getUserByEmail,
      { params: { email } }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `getBrampUserByEmail(${email})`);
  }
}

/**
 * Request a deposit (on-ramp). Returns bank transfer instructions.
 *
 * @param userId - Bramp user ID
 * @param amount - Amount in fiat currency (e.g. "1500.00")
 * @param toAddress - Kreivo SS58 address to receive minted DUSD tokens
 */
export async function requestDeposit(
  userId: number,
  amount: string,
  toAddress: string
): Promise<DepositResponse> {
  try {
    const response = await adapterClient.post<DepositResponse>(
      adapterConfig.endpoints.bramp.requestDeposit,
      { userId, amount, toAddress }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `requestDeposit(userId=${userId})`);
  }
}

/**
 * Confirm a deposit after the user has completed the bank transfer.
 * Triggers the blockchain Assets.mint on the backend.
 *
 * @param depositId - Deposit ID from requestDeposit
 * @param toAddress - Kreivo SS58 address to receive minted DUSD tokens
 */
export async function confirmDeposit(
  depositId: number,
  toAddress: string
): Promise<ConfirmDepositResponse> {
  try {
    const response = await adapterClient.post<ConfirmDepositResponse>(
      adapterConfig.endpoints.bramp.confirmDeposit(String(depositId)),
      { toAddress }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `confirmDeposit(${depositId})`);
  }
}

/**
 * Create a withdrawal (off-ramp). Stub for future use.
 *
 * @param userId - Bramp user ID
 * @param amount - Amount in crypto to withdraw
 */
export async function createWithdrawal(
  userId: number,
  amount: string
): Promise<WithdrawalResponse> {
  try {
    const response = await adapterClient.post<WithdrawalResponse>(
      adapterConfig.endpoints.bramp.createWithdrawal,
      { userId, amount }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `createWithdrawal(userId=${userId})`);
  }
}
