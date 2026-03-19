/**
 * Shared Adapter API Client
 *
 * Single axios instance for all adapter API modules.
 * Includes auth interceptor (Bearer token + x-user-email), automatic token
 * renewal via a 401 response interceptor, and error handling.
 *
 * Usage in adapter modules:
 *   import { adapterClient, handleApiError } from './client';
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { adapterConfig, API_TIMEOUTS } from '../config';
import { useAuthStore } from '@stores/authStore';
import { performWebAuthnLogin } from '@/lib/virto-sdk';

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

// Shared axios instance for all adapter API modules
export const adapterClient = axios.create({
  baseURL: adapterConfig.baseURL,
  timeout: API_TIMEOUTS.default,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Request interceptor: injects Bearer token and x-user-email
// ---------------------------------------------------------------------------

adapterClient.interceptors.request.use((config) => {
  const { token, user } = useAuthStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (user?.email) {
    config.headers['x-user-email'] = user.email;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor: automatic token renewal on 401
// ---------------------------------------------------------------------------

/** Whether a token refresh is already in flight. */
let isRefreshing = false;

/** Queue of requests waiting for the in-flight refresh to complete. */
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

/**
 * Resolves or rejects every request that was queued while a refresh was
 * in progress.
 */
function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (token) {
      resolve(token);
    } else {
      reject(error);
    }
  });
  failedQueue = [];
}

adapterClient.interceptors.response.use(
  // Successful responses pass through untouched
  (response) => response,

  // Error handler — only acts on 401 Unauthorized
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    // Non-401 errors or requests without config: reject immediately
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Already retried once — prevent infinite loops
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // If another refresh is already in flight, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return adapterClient(originalRequest);
      });
    }

    // First 401 — start the refresh flow
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const email = useAuthStore.getState().user?.email;

      if (!email) {
        // No user in store — cannot re-authenticate
        throw new Error('No user email available for token renewal');
      }

      // Re-authenticate via WebAuthn (triggers biometric prompt)
      const newToken = await performWebAuthnLogin(email);

      // Persist the new token in the auth store
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.getState().login(currentUser, newToken);
      }

      // Resolve all queued requests with the fresh token
      processQueue(null, newToken);

      // Retry the original request with the new token
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return adapterClient(originalRequest);
    } catch (refreshError) {
      // Reject all queued requests
      processQueue(refreshError, null);

      // Clear auth state and redirect to login
      useAuthStore.getState().logout();
      window.location.href = '/login';

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ---------------------------------------------------------------------------
// Error handler utility
// ---------------------------------------------------------------------------

/**
 * Standardized error handler for adapter API calls.
 * Enhances axios errors with statusCode and context, then re-throws.
 */
export function handleApiError(error: unknown, context: string): never {
  if (axios.isAxiosError(error)) {
    console.error(`[Adapter API Error] ${context}:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });

    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      'Unknown API error';

    const enhancedError = new Error(errorMessage) as Error & {
      statusCode?: number;
      context: string;
    };
    enhancedError.statusCode = error.response?.status || 500;
    enhancedError.context = context;

    throw enhancedError;
  }

  throw error;
}
