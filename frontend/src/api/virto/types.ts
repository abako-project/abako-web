/**
 * Virto API Type Definitions
 *
 * Types for WebAuthn, Payments, and Memberships API responses.
 */

// ========= WebAuthn / Authentication Types ==========

export interface HealthCheckResponse {
  status: string;
  timestamp?: string;
}

export interface CheckUserRegisteredResponse {
  registered: boolean;
  userId?: string;
}

export interface AttestationOptionsResponse {
  challenge: string;
  userId: string;
  name?: string;
  // Additional WebAuthn fields
  [key: string]: unknown;
}

export interface CustomRegisterResponse {
  success: boolean;
  userId: string;
  address?: string;
  [key: string]: unknown;
}

export interface AssertionOptionsResponse {
  challenge: string;
  userId: string;
  // Additional WebAuthn fields
  [key: string]: unknown;
}

export interface CustomConnectResponse {
  success: boolean;
  userId: string;
  token?: string;
  extrinsic?: string;
  [key: string]: unknown;
}

export interface GetUserAddressResponse {
  userId: string;
  address: string;
}

export interface AddMemberResponse {
  success: boolean;
  userId: string;
  membershipId?: string;
  [key: string]: unknown;
}

export interface IsMemberResponse {
  isMember: boolean;
  address: string;
  membershipId?: string;
}

export interface FundResponse {
  success: boolean;
  address: string;
  amount?: string;
  transactionHash?: string;
  [key: string]: unknown;
}

// ========= Payments Types ==========

export interface CreatePaymentData {
  amount: string | number;
  recipientAddress: string;
  projectId?: string;
  milestoneId?: string;
  remark?: string;
}

export interface CreatePaymentResponse {
  success: boolean;
  paymentId: string;
  txHash?: string;
}

export interface ReleasePaymentData {
  paymentId: string;
}

export interface ReleasePaymentResponse {
  success: boolean;
  paymentId: string;
  txHash?: string;
}

export interface AcceptAndPayData {
  paymentId: string;
}

export interface AcceptAndPayResponse {
  success: boolean;
  paymentId: string;
  txHash?: string;
}

/** Raw backend response shape for getPayment. */
export interface GetPaymentRawResponse {
  payment: {
    from: string;
    to: string;
    amount: string;
    asset: string;
    state: string;
    paymentId: string;
  } | null;
}

/** Frontend-friendly flat payment info. */
export interface PaymentInfo {
  paymentId: string;
  from: string;
  to: string;
  amount: string;
  asset: string;
  state: string;
}

// ========= Memberships Types ==========

export interface GetCommunityAddressResponse {
  communityId: string;
  address: string;
}

export interface GetMembersResponse {
  communityId: string;
  members: Array<{
    membershipId: string;
    address: string;
    joinedAt?: string;
    [key: string]: unknown;
  }>;
  page?: number;
  limit?: number;
  total?: number;
}

export interface GetMemberResponse {
  communityId: string;
  membershipId: string;
  address: string;
  joinedAt?: string;
  [key: string]: unknown;
}

export interface CheckMembershipResponse {
  communityId: string;
  address: string;
  isMember: boolean;
  membershipId?: string;
}

export interface AddCommunityMemberResponse {
  success: boolean;
  communityId: string;
  membershipId: string;
  memberAddress: string;
  [key: string]: unknown;
}

export interface RemoveMemberResponse {
  success: boolean;
  communityId: string;
  address: string;
  [key: string]: unknown;
}
