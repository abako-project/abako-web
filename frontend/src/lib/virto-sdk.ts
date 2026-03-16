/**
 * Virto Network SDK Utilities
 *
 * This module provides utilities for interacting with the Virto Network SDK
 * for WebAuthn-based authentication. The SDK is loaded from CDN.
 */

// Import the SDK from CDN (type definitions from the package)
// @ts-expect-error - SDK is loaded from CDN at runtime
import SDK from 'https://cdn.jsdelivr.net/npm/@virtonetwork/sdk@0.0.4-alpha.36/dist/esm/index.js';

export interface VirtoSDK {
  auth: {
    isRegistered: (email: string) => Promise<boolean>;
    prepareConnection: (email: string) => Promise<unknown>;
    sign: (extrinsic: string) => Promise<{ ok: boolean }>;
    prepareRegister: (email: string) => Promise<unknown>;
    prepareRegistration: (userData: { profile: { id: string; name?: string } }) => Promise<unknown>;
  };
}

export interface VirtoAuthResult {
  extrinsic: string;
  token: string;
}

/**
 * Initialize the Virto SDK with configuration.
 *
 * The SDK is configured to use the Abako federate server and Kreivo provider.
 * This matches the configuration in the existing EJS views.
 */
export function initializeVirtoSDK(): VirtoSDK {
  try {
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'https://dev.abako.xyz';
    const backendHost = new URL(backendUrl).host;

    const sdk = new SDK({
      federate_server: `${backendUrl}/api`,
      provider_url: `wss://${backendHost}/kreivo`,
      config: {
        wallet: 'polkadot',
      },
    });

    return sdk as VirtoSDK;
  } catch (error) {
    console.error('Error initializing Virto SDK:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Promise with timeout wrapper.
 *
 * Executes a promise with a timeout. If the promise doesn't resolve
 * within the specified time, it rejects with a timeout error.
 */
export function promiseWithTimeout<T>(promise: Promise<T>, ms: number, msg?: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(msg ?? 'Timeout exceeded')), ms)
  );

  return Promise.race([promise, timeout]);
}

/**
 * Perform the WebAuthn login flow.
 *
 * This function orchestrates the entire WebAuthn authentication process:
 * 1. Check if the user is registered
 * 2. Prepare the connection (generates challenge)
 * 3. Call the server to get the extrinsic and token
 * 4. Sign the extrinsic with WebAuthn
 * 5. Return the token
 *
 * @param email - User's email address
 * @param onProgress - Optional callback for progress updates
 * @returns The authentication token
 * @throws Error if any step fails
 */
export async function performWebAuthnLogin(
  email: string,
  onProgress?: (status: string) => void
): Promise<string> {
  try {
    if (!email) {
      throw new Error('Email is required');
    }

    const sdk = initializeVirtoSDK();

    // Check if user is registered
    onProgress?.('Checking registration status...');
    const registered = await sdk.auth.isRegistered(email);
    if (!registered) {
      throw new Error('User needs to register first');
    }

    // Prepare connection (get challenge)
    onProgress?.('Generating certificate for login...');
    const preparedData = await promiseWithTimeout(
      sdk.auth.prepareConnection(email),
      60000,
      'Timeout waiting for server to prepare login data'
    );

    if (!preparedData) {
      throw new Error('Login data was not generated');
    }

    // Get extrinsic from server
    onProgress?.('Getting extrinsic from server...');
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'https://dev.abako.xyz';
    const response = await fetch(`${backendUrl}/adapter/v1/auth/custom-connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: email,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const result = (await response.json()) as VirtoAuthResult;

    if (!result.extrinsic) {
      throw new Error('Extrinsic was not received from server');
    }

    if (!result.token) {
      throw new Error('Token was not received from server');
    }

    // Sign the transaction with WebAuthn
    onProgress?.('Signing transaction...');
    const signedResult = await sdk.auth.sign(result.extrinsic);

    if (!signedResult.ok) {
      throw new Error('Could not sign the extrinsic');
    }

    onProgress?.('Authentication successful');
    return result.token;
  } catch (error) {
    console.error('WebAuthn login error:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Perform the WebAuthn registration flow.
 *
 * Mirrors the EJS registration flow (clients/register.ejs, developers/register.ejs):
 * 1. Check if the user is already registered
 * 2. Call sdk.auth.prepareRegistration() to get the WebAuthn challenge
 * 3. Return the preparedData so the caller can send it to the backend API
 *
 * The backend handles the actual account creation via SEDA
 * (adapterAPI.customRegister + adapterAPI.createClient/createDeveloper).
 *
 * @param email - User's email address
 * @param name - User's display name
 * @param onProgress - Optional callback for progress updates
 * @returns The preparedData to send to POST /api/auth/register
 * @throws Error if any step fails
 */
export async function performWebAuthnRegister(
  email: string,
  name: string,
  onProgress?: (status: string) => void
): Promise<unknown> {
  try {
    if (!email) {
      throw new Error('Email is required');
    }

    if (!name) {
      throw new Error('Name is required');
    }

    const sdk = initializeVirtoSDK();

    // Check if user is already registered
    onProgress?.('Checking registration status...');
    const registered = await sdk.auth.isRegistered(email);
    if (registered) {
      throw new Error('This email is already registered. Please log in instead.');
    }

    // Prepare registration (get WebAuthn challenge)
    // Matches EJS: sdk.auth.prepareRegistration({profile: {id: email, name}})
    onProgress?.('Generating certificate for registration...');
    const preparedData = await promiseWithTimeout(
      sdk.auth.prepareRegistration({
        profile: {
          id: email,
          name: name || undefined,
        },
      }),
      60000,
      'Timeout waiting for server to prepare registration data'
    );

    if (!preparedData) {
      throw new Error('Registration data was not generated');
    }

    onProgress?.('Waiting for server response...');
    return preparedData;
  } catch (error) {
    console.error('WebAuthn registration error:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}
