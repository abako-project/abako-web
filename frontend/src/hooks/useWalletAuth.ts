/**
 * Wallet Authentication Hooks
 *
 * React Query hooks for wallet-based authentication via Polkadot extensions
 * (Talisman, Polkadot.js, SubWallet).
 *
 * The wallet provides the SS58 address which is converted to a synthetic
 * email ({address}@wallet.abako.xyz). All actual auth operations (registration,
 * session key funding) go through WebAuthn so the FederateServer can resolve
 * the user's blockchain address and the session key is properly funded.
 *
 * Registration flow (useWalletRegister):
 *   1. enableWallets() + getWalletAccounts() — select wallet account
 *   2. performWebAuthnRegister(walletEmail) — register in FederateServer
 *   3. svcCreateClient/Developer(walletEmail) — create adapter profile
 *   4. performWebAuthnLogin(walletEmail) — fund session key on-chain
 *   5. Store user + token in authStore
 *
 * Login flow (useWalletLogin):
 *   1. enableWallets() + getWalletAccounts() — select wallet account
 *   2. performWebAuthnLogin(walletEmail) — fund session key on-chain
 *   3. Look up profile by walletEmail, store in authStore
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@stores/authStore';
import { findClientByEmail as apiFindClientByEmail } from '@/api/adapter/clients';
import { findDeveloperByEmail as apiFindDeveloperByEmail } from '@/api/adapter/developers';
import {
  createClient as svcCreateClient,
  createDeveloper as svcCreateDeveloper,
} from '@/services';
import { performWebAuthnRegister, performWebAuthnLogin } from '@lib/virto-sdk';
import {
  enableWallets,
  getWalletAccounts,
  toWalletEmail,
  SUPPORTED_WALLETS,
  type WalletExtension,
  type WalletAccount,
} from '@lib/wallet-connect';
import type { User } from '@/types/index';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const walletAuthKeys = {
  all: ['walletAuth'] as const,
  extensions: () => [...walletAuthKeys.all, 'extensions'] as const,
  accounts: (walletName: string) => [...walletAuthKeys.all, 'accounts', walletName] as const,
};

// ---------------------------------------------------------------------------
// useDetectWallets
// ---------------------------------------------------------------------------

/**
 * Detects which supported wallet extensions are installed by calling
 * web3Enable and comparing the enabled extensions against the known list.
 *
 * The query is disabled until explicitly enabled (e.g. when the wallet
 * login page mounts) to avoid requesting wallet permissions prematurely.
 *
 * @param options.enabled - Whether to run the detection (default: false)
 */
export function useDetectWallets(options?: { enabled?: boolean }) {
  return useQuery<WalletExtension[]>({
    queryKey: walletAuthKeys.extensions(),
    queryFn: () => enableWallets('PolkaTalent'),
    enabled: options?.enabled ?? false,
    staleTime: 30 * 1000, // 30 seconds — extension state can change if user installs one
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// useWalletAccounts
// ---------------------------------------------------------------------------

/**
 * Retrieves all accounts exposed by a specific wallet extension.
 *
 * Must be called after useDetectWallets has run (so permissions are granted).
 *
 * @param walletName - The source name of the wallet (e.g. 'talisman')
 * @param options.enabled - Whether to fetch accounts (default: false)
 */
export function useWalletAccounts(walletName: string, options?: { enabled?: boolean }) {
  return useQuery<WalletAccount[]>({
    queryKey: walletAuthKeys.accounts(walletName),
    queryFn: () => getWalletAccounts(walletName),
    enabled: options?.enabled ?? false,
    staleTime: 10 * 1000,
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// Wallet login credentials shape
// ---------------------------------------------------------------------------

export interface WalletLoginCredentials {
  /** SS58 address of the selected account */
  address: string;
  /** Display name from the wallet (optional) */
  accountName?: string;
}

export interface WalletLoginResult {
  user: User;
  token: string;
  /** True when the wallet address has no associated client or developer profile */
  noProfile?: boolean;
}

// ---------------------------------------------------------------------------
// Wallet registration credentials shape
// ---------------------------------------------------------------------------

export interface WalletRegisterCredentials {
  /** SS58 address of the selected account */
  address: string;
  /** Human-readable name to store on the profile */
  name: string;
  /** Whether to create a client or developer profile */
  role: 'client' | 'developer';
}

export interface WalletRegisterResult {
  user: User;
  token: string;
}

// ---------------------------------------------------------------------------
// useWalletLogin
// ---------------------------------------------------------------------------

/**
 * Mutation that performs the full wallet-based login flow.
 *
 * The wallet provides the SS58 address which is converted to a synthetic
 * email ({address}@wallet.abako.xyz). The actual authentication goes through
 * WebAuthn so the session key is properly signed and funded on-chain.
 *
 * Steps:
 *   1. Derive synthetic email from wallet address
 *   2. performWebAuthnLogin(walletEmail) — handles customConnect + sign + fund
 *   3. Look up existing profile and store in authStore
 *
 * The user will see a WebAuthn prompt (biometric / security key) to
 * authorize the session key funding transaction.
 */
export function useWalletLogin() {
  const queryClient = useQueryClient();
  const login = useAuthStore((state) => state.login);

  return useMutation<WalletLoginResult, Error, WalletLoginCredentials>({
    mutationFn: async ({ address, accountName }) => {
      const walletEmail = toWalletEmail(address);

      // Step 1: WebAuthn login flow — customConnect + sign + submit funding tx.
      // This ensures the session key is properly funded on-chain, which is
      // required for backend operations that sign blockchain transactions
      // (e.g. calendar set_availability).
      let token: string;
      try {
        token = await performWebAuthnLogin(walletEmail);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Authentication failed';
        throw new Error(`WALLET_CONNECT_FAILED: ${message}`);
      }

      // Step 2: Look up existing profile keyed by the synthetic wallet email.
      let user: User;
      let noProfile = false;

      const [existingClient, existingDeveloper] = await Promise.all([
        apiFindClientByEmail(walletEmail).catch(() => undefined),
        apiFindDeveloperByEmail(walletEmail).catch(() => undefined),
      ]);

      if (existingClient) {
        user = {
          email: walletEmail,
          name: existingClient.name ?? accountName ?? address,
          clientId: existingClient.id,
        };
      } else if (existingDeveloper) {
        user = {
          email: walletEmail,
          name: existingDeveloper.name ?? accountName ?? address,
          developerId: existingDeveloper.id,
        };
      } else {
        noProfile = true;
        user = {
          email: walletEmail,
          name: accountName ?? address,
        };
      }

      return { user, token, noProfile };
    },

    onSuccess: (data) => {
      if (!data.noProfile) {
        login(data.user, data.token);
        void queryClient.invalidateQueries({ queryKey: ['auth'] });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// useWalletRegister
// ---------------------------------------------------------------------------

/**
 * Mutation that performs the full wallet-based registration flow.
 *
 * The wallet provides the SS58 address, which is converted to a synthetic
 * email ({address}@wallet.abako.xyz). Registration and session key funding
 * both go through WebAuthn so the FederateServer knows the user and the
 * session key is properly funded on-chain.
 *
 * Steps:
 *   1. WebAuthn registration ceremony → preparedData (attestation)
 *   2. customRegister(preparedData) + createProfile (via service layer)
 *   3. performWebAuthnLogin → customConnect + sign + fund session key
 *   4. Store user + token in authStore
 *
 * The user will see TWO WebAuthn prompts:
 *   - First: registration (create credential for the synthetic email)
 *   - Second: login (sign the session key funding transaction)
 */
export function useWalletRegister() {
  const queryClient = useQueryClient();
  const login = useAuthStore((state) => state.login);

  return useMutation<WalletRegisterResult, Error, WalletRegisterCredentials>({
    mutationFn: async ({ address, name, role }) => {
      const walletEmail = toWalletEmail(address);

      // Step 1: Run the WebAuthn ceremony with the synthetic email.
      // This generates real attestation data that the adapter's
      // custom-register endpoint requires to register the user in
      // the FederateServer (email → blockchain address mapping).
      let preparedData: unknown;
      try {
        preparedData = await performWebAuthnRegister(walletEmail, name);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'WebAuthn registration failed';
        throw new Error(`WALLET_REGISTER_FAILED: ${message}`);
      }

      // Step 2: Register in FederateServer + create profile entity.
      // Uses the same service-layer functions as the pure WebAuthn flow:
      //   customRegister(preparedData)  →  registers in FederateServer
      //   apiCreateClient/Developer     →  creates adapter profile
      if (role === 'client') {
        await svcCreateClient(walletEmail, name, preparedData);
      } else {
        await svcCreateDeveloper(walletEmail, name, preparedData);
      }

      // Step 3: WebAuthn login — customConnect + sign + fund session key.
      // This ensures the session key is properly funded on-chain via the
      // WebAuthn credential created in step 1.
      let token: string;
      try {
        token = await performWebAuthnLogin(walletEmail);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Session key funding failed';
        throw new Error(`WALLET_CONNECT_FAILED: ${message}`);
      }

      // Step 4: Build user record. After creating the profile in step 2 we
      // fetch it to obtain the generated id (clientId / developerId).
      let user: User;

      if (role === 'client') {
        const createdClient = await apiFindClientByEmail(walletEmail).catch(() => undefined);
        user = {
          email: walletEmail,
          name: createdClient?.name ?? name,
          clientId: createdClient?.id,
        };
      } else {
        const createdDeveloper = await apiFindDeveloperByEmail(walletEmail).catch(() => undefined);
        user = {
          email: walletEmail,
          name: createdDeveloper?.name ?? name,
          developerId: createdDeveloper?.id,
        };
      }

      return { user, token };
    },

    onSuccess: (data) => {
      login(data.user, data.token);
      void queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Helper: derive a human-readable label for a wallet from its source name
// ---------------------------------------------------------------------------

export function getWalletDisplayName(sourceName: string): string {
  const found = SUPPORTED_WALLETS.find((w) => w.name === sourceName);
  return found?.displayName ?? sourceName;
}

// ---------------------------------------------------------------------------
// Helper: classify wallet login errors for the UI
// ---------------------------------------------------------------------------

export type WalletLoginErrorKind =
  | 'server_unsupported' // server rejected the SS58 address
  | 'user_rejected' // user cancelled signing in the wallet
  | 'no_accounts' // wallet connected but has no accounts
  | 'unknown';

export function classifyWalletError(error: Error): WalletLoginErrorKind {
  const msg = error.message;

  if (msg.startsWith('WALLET_CONNECT_FAILED')) {
    // 4xx from server typically means address format is not supported
    if (msg.includes('400') || msg.includes('404') || msg.includes('not found')) {
      return 'server_unsupported';
    }
    return 'unknown';
  }

  if (msg.startsWith('WALLET_SIGN_FAILED')) {
    // User explicitly cancelled the signing prompt
    if (
      msg.toLowerCase().includes('cancel') ||
      msg.toLowerCase().includes('reject') ||
      msg.toLowerCase().includes('denied')
    ) {
      return 'user_rejected';
    }
    return 'unknown';
  }

  return 'unknown';
}
