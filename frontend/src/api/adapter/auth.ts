/**
 * Auth Adapter API
 *
 * Handles authentication operations with the adapter API.
 * Ported from backend/models/adapter.js (checkRegistered, customRegister, customConnect, sign)
 */

import { adapterClient, handleApiError } from './client';
import { adapterConfig, API_TIMEOUTS } from '../config';

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

interface CheckRegisteredResponse {
  registered: boolean;
  [key: string]: unknown;
}

interface CustomRegisterRequest {
  userId: string;
  name: string;
  email: string;
  [key: string]: unknown;
}

interface CustomRegisterResponse {
  success: boolean;
  token?: string;
  [key: string]: unknown;
}

interface CustomConnectRequest {
  userId: string;
  [key: string]: unknown;
}

interface CustomConnectResponse {
  success: boolean;
  token?: string;
  [key: string]: unknown;
}

interface SignRequest {
  extrinsic: string;
  [key: string]: unknown;
}

interface SignResponse {
  signature: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Auth API methods
// ---------------------------------------------------------------------------

/**
 * Check if a user is already registered in the adapter API.
 */
export async function checkRegistered(userId: string): Promise<CheckRegisteredResponse> {
  try {
    const response = await adapterClient.get<CheckRegisteredResponse>(
      adapterConfig.endpoints.auth.checkRegistered(userId)
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `checkRegistered(${userId})`);
  }
}

/**
 * Register a new user with the adapter API.
 */
export async function customRegister(data: CustomRegisterRequest): Promise<CustomRegisterResponse> {
  try {
    const response = await adapterClient.post<CustomRegisterResponse>(
      adapterConfig.endpoints.auth.customRegister,
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'customRegister');
  }
}

/**
 * Connect/login an existing user with the adapter API.
 */
export async function customConnect(data: CustomConnectRequest): Promise<CustomConnectResponse> {
  try {
    const response = await adapterClient.post<CustomConnectResponse>(
      adapterConfig.endpoints.auth.customConnect,
      data
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'customConnect');
  }
}

/**
 * Sign an extrinsic with the user's credentials.
 * This function accepts an explicit token parameter that may differ from the stored auth token.
 */
export async function sign(extrinsicData: SignRequest, token: string): Promise<SignResponse> {
  try {
    const response = await adapterClient.post<SignResponse>(
      adapterConfig.endpoints.auth.sign,
      extrinsicData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: API_TIMEOUTS.blockchainWrite,
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'sign');
  }
}
