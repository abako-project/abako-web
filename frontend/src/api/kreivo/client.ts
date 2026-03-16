/**
 * Kreivo chain JSON-RPC HTTP client.
 *
 * Sends JSON-RPC 2.0 requests to the chain node over HTTP POST.
 * No WebSocket, no polkadot-api, no RxJS — just fetch.
 *
 * Default endpoint: VITE_API_BASE_URL/kreivo (falls back to dev.abako.xyz/kreivo).
 * Override independently via VITE_KREIVO_RPC_URL if needed.
 */

import type { JsonRpcRequest, JsonRpcResponse } from './types';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const KREIVO_RPC_URL = import.meta.env.VITE_KREIVO_RPC_URL
  || `${import.meta.env.VITE_API_BASE_URL || 'https://dev.abako.xyz'}/kreivo`;
const REQUEST_TIMEOUT_MS = 10_000;

let requestId = 0;

// ---------------------------------------------------------------------------
// Core RPC call
// ---------------------------------------------------------------------------

/**
 * Send a single JSON-RPC 2.0 request to the Kreivo chain node.
 *
 * @param method - Substrate RPC method (e.g. "chain_getHeader")
 * @param params - Method parameters (default: empty array)
 * @returns The `result` field from the JSON-RPC response
 * @throws Error if the node returns an error or the request times out
 */
export async function rpcCall<T>(method: string, params: unknown[] = []): Promise<T> {
  const id = ++requestId;

  const body: JsonRpcRequest = {
    jsonrpc: '2.0',
    id,
    method,
    params,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(KREIVO_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Kreivo RPC HTTP ${response.status}: ${response.statusText}`);
    }

    const json = (await response.json()) as JsonRpcResponse<T>;

    if (json.error) {
      throw new Error(`Kreivo RPC error [${method}]: ${json.error.message}`);
    }

    return json.result as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Send multiple JSON-RPC requests in a single HTTP batch call.
 * The Kreivo node supports batch requests per the JSON-RPC 2.0 spec.
 *
 * @param calls - Array of { method, params } objects
 * @returns Array of results in the same order as the input calls
 */
export async function rpcBatch<T extends unknown[]>(
  calls: { method: string; params?: unknown[] }[],
): Promise<T> {
  const bodies: JsonRpcRequest[] = calls.map((call) => ({
    jsonrpc: '2.0',
    id: ++requestId,
    method: call.method,
    params: call.params ?? [],
  }));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(KREIVO_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodies),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Kreivo RPC batch HTTP ${response.status}: ${response.statusText}`);
    }

    const results = (await response.json()) as JsonRpcResponse[];

    // Sort by request id to guarantee order matches input
    const sorted = results.sort((a, b) => a.id - b.id);

    return sorted.map((r, i) => {
      if (r.error) {
        throw new Error(`Kreivo RPC batch error [${calls[i]!.method}]: ${r.error.message}`);
      }
      return r.result;
    }) as T;
  } finally {
    clearTimeout(timeout);
  }
}
