/**
 * Virto API - Payments
 *
 * Functions for creating, releasing, and managing blockchain payments
 * via the Kreivo Payments pallet.
 */

import { virtoConfig } from '../config';
import { virtoClient, handleVirtoError } from './client';
import type {
  CreatePaymentData,
  CreatePaymentResponse,
  ReleasePaymentData,
  ReleasePaymentResponse,
  AcceptAndPayData,
  AcceptAndPayResponse,
  GetPaymentRawResponse,
  PaymentInfo,
  HealthCheckResponse,
} from './types';

/**
 * Create a new payment on the blockchain (Payments.pay).
 *
 * Locks funds in escrow until release conditions are met.
 *
 * @param paymentData - Payment details (amount, recipient, project, milestone)
 * @returns Payment creation result with paymentId and txHash
 */
export async function createPayment(
  paymentData: CreatePaymentData
): Promise<CreatePaymentResponse> {
  try {
    const response = await virtoClient.post<CreatePaymentResponse>(
      virtoConfig.endpoints.payments.create,
      paymentData
    );
    return response.data;
  } catch (error) {
    handleVirtoError(error, 'createPayment');
  }
}

/**
 * Release a payment to the recipient (Payments.release).
 *
 * Called by the client after approving deliverables.
 */
export async function releasePayment(
  paymentData: ReleasePaymentData
): Promise<ReleasePaymentResponse> {
  try {
    const response = await virtoClient.post<ReleasePaymentResponse>(
      virtoConfig.endpoints.payments.release,
      paymentData
    );
    return response.data;
  } catch (error) {
    handleVirtoError(error, 'releasePayment');
  }
}

/**
 * Accept and pay in a single transaction (Payments.accept_and_pay).
 *
 * Called by the developer to claim released funds.
 */
export async function acceptAndPay(paymentData: AcceptAndPayData): Promise<AcceptAndPayResponse> {
  try {
    const response = await virtoClient.post<AcceptAndPayResponse>(
      virtoConfig.endpoints.payments.acceptAndPay,
      paymentData
    );
    return response.data;
  } catch (error) {
    handleVirtoError(error, 'acceptAndPay');
  }
}

/**
 * Get payment details by ID from the Payments pallet.
 *
 * Maps the backend's nested `{ payment: { ... } | null }` shape
 * into a flat `PaymentInfo` or null.
 *
 * @param paymentId - Unique payment identifier
 * @returns Flat payment info, or null if not found
 */
export async function getPayment(paymentId: string): Promise<PaymentInfo | null> {
  try {
    const response = await virtoClient.get<GetPaymentRawResponse>(
      virtoConfig.endpoints.payments.get,
      {
        params: { paymentId },
      }
    );

    const raw = response.data.payment;
    if (!raw) return null;

    return {
      paymentId: raw.paymentId,
      from: raw.from,
      to: raw.to,
      amount: raw.amount,
      asset: raw.asset,
      state: raw.state,
    };
  } catch (error) {
    handleVirtoError(error, `getPayment(${paymentId})`);
  }
}

/**
 * Health check for the Payments API.
 */
export async function paymentsHealthCheck(): Promise<HealthCheckResponse> {
  try {
    const response = await virtoClient.get<HealthCheckResponse>(
      virtoConfig.endpoints.payments.health
    );
    return response.data;
  } catch (error) {
    handleVirtoError(error, 'paymentsHealthCheck');
  }
}
