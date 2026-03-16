/**
 * Virto API HTTP Client
 *
 * Axios instance configured for the Virto API (WebAuthn, Payments, Memberships).
 * All endpoints are exposed at VITE_API_BASE_URL (defaults to dev.abako.xyz).
 */

import axios, { AxiosError } from 'axios';
import { virtoConfig, API_TIMEOUT } from '../config';

/**
 * Axios client for Virto API.
 * Does NOT require auth interceptor - most endpoints are public or use userId params.
 */
export const virtoClient = axios.create({
  baseURL: virtoConfig.baseURL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Enhanced error with additional context for debugging.
 */
export class VirtoApiError extends Error {
  statusCode: number;
  originalError: AxiosError | Error;
  context: string;

  constructor(error: AxiosError | Error, context: string) {
    const axiosError = error as AxiosError;
    const responseData = axiosError.response?.data as { message?: string } | undefined;
    const message =
      responseData?.message ||
      axiosError.message ||
      'Unknown Virto API error';

    super(message);
    this.name = 'VirtoApiError';
    this.statusCode = axiosError.response?.status || 500;
    this.originalError = error;
    this.context = context;

    // Preserve the stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, VirtoApiError);
    }
  }
}

/**
 * Generic error handler for Virto API calls.
 * Logs the error with context and throws an enhanced error.
 */
export function handleVirtoError(error: unknown, context: string): never {
  const axiosError = error as AxiosError;

  console.error(`[Virto API Error] ${context}:`, {
    message: axiosError.message,
    status: axiosError.response?.status,
    data: axiosError.response?.data,
    url: axiosError.config?.url,
  });

  throw new VirtoApiError(axiosError, context);
}
