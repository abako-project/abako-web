/**
 * Wallet Connect Utilities
 *
 * Provides utilities for connecting to Polkadot-compatible wallet extensions
 * (Talisman, Polkadot.js Extension, SubWallet) via @polkadot/extension-dapp.
 *
 * This module is used as the foundation for the wallet-based auth path,
 * which bypasses the Virto SDK entirely and signs extrinsics via the wallet
 * extension's own signer instead of WebAuthn.
 */

import { web3Enable, web3Accounts, web3FromAddress } from '@polkadot/extension-dapp';
import type { InjectedAccountWithMeta, InjectedExtension } from '@polkadot/extension-inject/types';

// Extend Window to include injectedWeb3 (set by wallet extensions)
declare global {
  interface Window {
    injectedWeb3?: Record<string, unknown>;
  }
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface WalletAccount {
  address: string;
  name?: string;
  source: string; // 'talisman' | 'polkadot-js' | 'subwallet-js'
}

export interface WalletExtension {
  name: string;
  displayName: string;
  installUrl: string;
  installed: boolean;
}

export interface WalletSigner {
  signPayload?: (payload: SignerPayloadRaw) => Promise<{ id: number; signature: string }>;
  signRaw?: (raw: SignerPayloadRaw) => Promise<{ id: number; signature: string }>;
}

export interface SignerPayloadRaw {
  address: string;
  data: string;
  type?: 'bytes' | 'payload';
}

// ---------------------------------------------------------------------------
// Supported wallets registry
// ---------------------------------------------------------------------------

export const SUPPORTED_WALLETS = [
  {
    name: 'talisman',
    displayName: 'Talisman',
    installUrl: 'https://talisman.xyz/',
  },
  {
    name: 'polkadot-js',
    displayName: 'Polkadot.js',
    installUrl: 'https://polkadot.js.org/extension/',
  },
  {
    name: 'subwallet-js',
    displayName: 'SubWallet',
    installUrl: 'https://subwallet.app/',
  },
] as const;

export type SupportedWalletName = (typeof SUPPORTED_WALLETS)[number]['name'];

/**
 * Generate a synthetic email for a wallet address.
 *
 * Wallet users don't have a traditional email, but the FederateServer requires
 * an email-like userId to create the address mapping. This synthetic email
 * bridges the gap so that wallet users are registered in the FederateServer
 * and backend operations (e.g. calendar set_availability with signing) can
 * resolve the caller's blockchain address.
 *
 * @param address - SS58 wallet address
 * @returns Synthetic email in the format `{address}@wallet.abako.xyz`
 */
export function toWalletEmail(address: string): string {
  return `${address}@wallet.abako.xyz`;
}

/**
 * Check whether a given email is a synthetic wallet email.
 *
 * @param email - Email or wallet-derived email to check
 * @returns True if the email matches the wallet synthetic pattern
 */
export function isWalletEmail(email: string): boolean {
  return email.endsWith('@wallet.abako.xyz');
}

// ---------------------------------------------------------------------------
// Core wallet functions
// ---------------------------------------------------------------------------

/**
 * Wait for wallet extensions to inject into window.injectedWeb3.
 * Some wallets (especially in Arc, Brave, or with multiple extensions)
 * need extra time to inject their providers after page load.
 */
async function waitForInjection(timeoutMs = 1500): Promise<void> {
  // If injectedWeb3 already has entries, no need to wait
  if (
    typeof window !== 'undefined' &&
    window.injectedWeb3 &&
    Object.keys(window.injectedWeb3).length > 0
  ) {
    return;
  }

  // Poll for injection every 100ms up to the timeout
  return new Promise<void>((resolve) => {
    const start = Date.now();
    const check = (): void => {
      if (
        (window.injectedWeb3 && Object.keys(window.injectedWeb3).length > 0) ||
        Date.now() - start > timeoutMs
      ) {
        resolve();
        return;
      }
      setTimeout(check, 100);
    };
    check();
  });
}

/**
 * Check if specific wallets are available by looking at window.injectedWeb3
 * directly. This is more reliable than web3Enable for detection because
 * web3Enable requires user permission which may not have been granted yet.
 */
function detectInstalledWalletsFromWindow(): Set<string> {
  const installed = new Set<string>();
  if (typeof window === 'undefined' || !window.injectedWeb3) return installed;

  for (const key of Object.keys(window.injectedWeb3)) {
    // Talisman injects as 'talisman'
    // Polkadot.js injects as 'polkadot-js'
    // SubWallet injects as 'subwallet-js'
    installed.add(key);
  }
  return installed;
}

/**
 * Request permission from all installed wallet extensions and return
 * the detection status of each supported wallet.
 *
 * Uses a two-phase approach:
 * 1. First checks window.injectedWeb3 directly (no permission needed)
 * 2. Then calls web3Enable to request permission from detected wallets
 *
 * @param appName - Application name shown in the wallet permission dialog
 * @returns Array of wallet extensions with installed status
 */
export async function enableWallets(appName = 'PolkaTalent'): Promise<WalletExtension[]> {
  // Phase 1: Wait for extensions to inject (Arc/Brave may be slow)
  await waitForInjection(2000);

  // Phase 2: Check window.injectedWeb3 directly for detection
  const detectedFromWindow = detectInstalledWalletsFromWindow();

  // Phase 3: Call web3Enable to get permission (needed for account access)
  let enabledExtensions: InjectedExtension[] = [];
  try {
    enabledExtensions = await web3Enable(appName);
  } catch (error) {
    console.warn('[wallet-connect] web3Enable failed:', error);
  }

  // Merge both detection sources: a wallet is "installed" if it appears
  // in EITHER window.injectedWeb3 OR the web3Enable result
  const enabledNames = new Set(enabledExtensions.map((ext) => ext.name));

  return SUPPORTED_WALLETS.map((wallet) => ({
    ...wallet,
    installed: detectedFromWindow.has(wallet.name) || enabledNames.has(wallet.name),
  }));
}

/**
 * Retrieve all accounts exposed by a specific wallet extension (or all
 * installed wallets if no walletName is provided).
 *
 * Must be called after {@link enableWallets} so the extension has been
 * granted permission.
 *
 * @param walletName - Filter to accounts from this source only
 * @returns Array of wallet accounts
 */
export async function getWalletAccounts(walletName?: string): Promise<WalletAccount[]> {
  let allAccounts: InjectedAccountWithMeta[] = [];

  try {
    allAccounts = await web3Accounts();
  } catch (error) {
    console.warn('[wallet-connect] web3Accounts failed:', error);
    return [];
  }

  const filtered = walletName
    ? allAccounts.filter((acc) => acc.meta.source === walletName)
    : allAccounts;

  return filtered.map((acc) => ({
    address: acc.address,
    name: acc.meta.name,
    source: acc.meta.source ?? 'unknown',
  }));
}

/**
 * Get the injected signer for a specific account address.
 *
 * Must be called after {@link enableWallets}.
 *
 * @param address - SS58 address of the account to sign with
 * @returns The wallet's signer object
 * @throws Error if the address has no injected signer
 */
export async function getWalletSigner(address: string): Promise<WalletSigner> {
  const injector = await web3FromAddress(address);
  if (!injector.signer) {
    throw new Error(`No signer available for address: ${address}`);
  }
  return injector.signer as unknown as WalletSigner;
}

/**
 * Sign an arbitrary hex payload using the wallet extension signer.
 *
 * The custom-connect endpoint returns an extrinsic as a hex string. This
 * function asks the wallet extension to sign it via signRaw (sign arbitrary
 * bytes), which is more widely supported than signPayload across extensions.
 *
 * @param address - SS58 address of the signing account
 * @param hexData - Hex-encoded data to sign (the extrinsic from custom-connect)
 * @returns Signature hex string
 */
export async function signWithWallet(address: string, hexData: string): Promise<string> {
  const signer = await getWalletSigner(address);

  // Prefer signRaw for signing arbitrary bytes (extrinsics)
  if (signer.signRaw) {
    const { signature } = await signer.signRaw({
      address,
      data: hexData,
      type: 'bytes',
    });
    return signature;
  }

  // Fall back to signPayload if signRaw is unavailable
  if (signer.signPayload) {
    const { signature } = await signer.signPayload({
      address,
      data: hexData,
      type: 'payload',
    });
    return signature;
  }

  throw new Error('Wallet signer supports neither signRaw nor signPayload');
}
