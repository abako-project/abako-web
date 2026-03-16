/**
 * Kreivo chain RPC methods.
 *
 * Typed wrappers around the raw JSON-RPC calls to the Kreivo node.
 * These are the building blocks consumed by the TanStack Query hooks.
 */

import { rpcCall, rpcBatch } from './client';
import {
  ss58ToAccountId,
  systemAccountKey,
  assetsAccountKey,
  decodeSystemAccount,
  decodeAssetsAccount,
  formatBalance,
} from './codec';
import type { SubstrateHeader, StorageHex } from './types';

// ---------------------------------------------------------------------------
// Chain head queries
// ---------------------------------------------------------------------------

/**
 * Get the latest best (non-finalised) block header.
 */
export async function getBestHeader(): Promise<SubstrateHeader> {
  return rpcCall<SubstrateHeader>('chain_getHeader');
}

/**
 * Get the hash of the latest finalised block.
 */
export async function getFinalizedHash(): Promise<string> {
  return rpcCall<string>('chain_getFinalizedHead');
}

/**
 * Get the header of a specific block by hash.
 */
export async function getHeaderByHash(hash: string): Promise<SubstrateHeader> {
  return rpcCall<SubstrateHeader>('chain_getHeader', [hash]);
}

/**
 * Parse the hex-encoded block number from a SubstrateHeader.
 */
export function parseBlockNumber(header: SubstrateHeader): number {
  return parseInt(header.number, 16);
}

// ---------------------------------------------------------------------------
// Batched explorer query (used by useExplorerData)
// ---------------------------------------------------------------------------

export interface ExplorerSnapshot {
  bestBlock: number;
  finalizedBlock: number;
}

/**
 * Fetch both the best block number and the finalized block number
 * in a single batched RPC call.
 */
export async function getExplorerSnapshot(): Promise<ExplorerSnapshot> {
  const [bestHeader, finalizedHash] = await rpcBatch<[SubstrateHeader, string]>([
    { method: 'chain_getHeader' },
    { method: 'chain_getFinalizedHead' },
  ]);

  const finalizedHeader = await getHeaderByHash(finalizedHash);

  return {
    bestBlock: parseBlockNumber(bestHeader),
    finalizedBlock: parseBlockNumber(finalizedHeader),
  };
}

// ---------------------------------------------------------------------------
// Balance queries
// ---------------------------------------------------------------------------

/** Kreivo asset IDs (from chain_spec / runtime). */
export const ASSET_IDS = {
  /** DUSD stablecoin asset ID on Kreivo (on-chain: Here(1), metadata: "testUSD" / "tUSD"). */
  DUSD: 1,
} as const;

/** Decimal places for each asset (sourced from on-chain Assets.Metadata). */
export const DECIMALS = {
  KSM: 12,
  DUSD: 3,
} as const;

export interface BalanceResult {
  ksmFree: string;
  ksmReserved: string;
  dusdFree: string;
  ksmPlanck: bigint;
  dusdPlanck: bigint;
}

/**
 * Query the KSM (native) and DUSD (asset) balances for an SS58 address.
 * Uses state_getStorage with pre-computed storage keys.
 */
export async function getBalances(ss58Address: string): Promise<BalanceResult> {
  const accountId = ss58ToAccountId(ss58Address);

  const sysKey = systemAccountKey(accountId);
  const dusdKey = assetsAccountKey(ASSET_IDS.DUSD, accountId);

  const [sysStorage, dusdStorage] = await rpcBatch<
    [StorageHex, StorageHex]
  >([
    { method: 'state_getStorage', params: [sysKey] },
    { method: 'state_getStorage', params: [dusdKey] },
  ]);

  let ksmPlanck = 0n;
  let ksmReservedPlanck = 0n;
  if (sysStorage) {
    const decoded = decodeSystemAccount(sysStorage);
    ksmPlanck = decoded.free;
    ksmReservedPlanck = decoded.reserved;
  }

  let dusdPlanck = 0n;
  if (dusdStorage) {
    const decoded = decodeAssetsAccount(dusdStorage);
    dusdPlanck = decoded.balance;
  }

  return {
    ksmFree: formatBalance(ksmPlanck, DECIMALS.KSM),
    ksmReserved: formatBalance(ksmReservedPlanck, DECIMALS.KSM),
    dusdFree: formatBalance(dusdPlanck, DECIMALS.DUSD),
    ksmPlanck,
    dusdPlanck,
  };
}

// ---------------------------------------------------------------------------
// KSM price (from CoinGecko public API — supports CORS, no scraping needed)
// ---------------------------------------------------------------------------

const COINGECKO_KSM_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=kusama&vs_currencies=usd';

interface CoinGeckoResponse {
  kusama?: { usd?: number };
}

/**
 * Fetch the KSM/USD price from CoinGecko's free public API.
 * Returns the price as a string (e.g. "32.45") or null if unavailable.
 * Falls back gracefully so the wallet card still shows balances without price.
 */
export async function getKsmPriceUsd(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    const res = await fetch(COINGECKO_KSM_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = (await res.json()) as CoinGeckoResponse;
    const price = data.kusama?.usd;

    return price != null ? price.toFixed(2) : null;
  } catch {
    return null;
  }
}
