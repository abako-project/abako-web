/**
 * Minimal SCALE codec utilities for Kreivo storage queries.
 *
 * Only the subset needed:
 *   - twox128 hash (for storage pallet/item prefixes)
 *   - SS58 → raw account bytes (for blake2_128_concat key suffix)
 *   - SCALE compact integer decoding
 *   - Account balance decoding (System.Account)
 *   - Assets balance decoding (Assets.Account)
 *
 * We use the xxhash-wasm package (already pulled via polkadot ecosystem
 * or we implement a JS twox128). For blake2, we use a lightweight approach.
 */

// ---------------------------------------------------------------------------
// Hex utilities
// ---------------------------------------------------------------------------

/** Convert a hex string (with or without 0x prefix) to Uint8Array. */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Convert Uint8Array to hex string (without 0x prefix). */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------------------------------------------------------------
// twox128 hash (used for storage key prefixes)
// ---------------------------------------------------------------------------

/**
 * Pre-computed twox128 hashes for the storage keys we need.
 * These are constant for a given pallet/item name and never change.
 *
 * Computed via subxt / polkadot.js or any Substrate tool:
 *   twox128("System")  = 26aa394eea5630e07c48ae0c9558cef7
 *   twox128("Account") = b99d880ec681799c0cf30e8886371da9
 *   twox128("Assets")  = 682a59d51ab9e48a8c8cc418ff9708d2
 *   twox128("Account") (under Assets) = b99d880ec681799c0cf30e8886371da9
 */
export const STORAGE_PREFIXES = {
  /** twox128("System") + twox128("Account") */
  systemAccount: '26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da9',
  /** twox128("Assets") + twox128("Account") */
  assetsAccount: '682a59d51ab9e48a8c8cc418ff9708d2b99d880ec681799c0cf30e8886371da9',
} as const;

// ---------------------------------------------------------------------------
// SS58 decode (address → raw 32-byte account ID)
// ---------------------------------------------------------------------------

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Decode a base58-encoded string to bytes.
 * Used to extract the 32-byte account ID from an SS58 address.
 */
export function base58Decode(encoded: string): Uint8Array {
  const bytes: number[] = [0];

  for (const char of encoded) {
    let carry = BASE58_ALPHABET.indexOf(char);
    if (carry < 0) throw new Error(`Invalid base58 character: ${char}`);

    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j]! * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  // Add leading zeros
  for (let i = 0; i < encoded.length && encoded[i] === '1'; i++) {
    bytes.push(0);
  }

  return new Uint8Array(bytes.reverse());
}

/**
 * Extract the 32-byte account ID from an SS58 address string.
 * SS58 format: [prefix byte(s)] [32 bytes account ID] [2 bytes checksum]
 *
 * For simple (1-byte prefix) addresses: skip 1 byte, take 32 bytes.
 * For canary prefix (2-byte prefix like Kreivo's 2): first byte >= 64,
 * skip 2 bytes, take 32 bytes.
 */
export function ss58ToAccountId(address: string): Uint8Array {
  const decoded = base58Decode(address);

  // Determine prefix length: if first byte < 64 → 1 byte prefix, else 2 bytes
  const prefixLen = decoded[0]! < 64 ? 1 : 2;
  const accountId = decoded.slice(prefixLen, prefixLen + 32);

  if (accountId.length !== 32) {
    throw new Error(`Invalid SS58 address: expected 32-byte account ID, got ${accountId.length}`);
  }

  return accountId;
}

// ---------------------------------------------------------------------------
// blake2b_128_concat (for Substrate storage map key hashing)
// ---------------------------------------------------------------------------

/**
 * blake2b_128_concat: blake2b(16 bytes) ++ original_key
 *
 * This is the standard Substrate hasher for storage maps with "Blake2_128Concat".
 * We need it to construct storage keys for System.Account and Assets.Account.
 *
 * Instead of importing a full blake2 library, we use the Web Crypto API
 * with a fallback: since blake2b isn't natively in Web Crypto, we implement
 * a minimal pure-JS blake2b-128.
 */

// Minimal blake2b constants (sigma, IV)
const BLAKE2B_IV = new Uint32Array([
  0xf3bcc908, 0x6a09e667, 0x84caa73b, 0xbb67ae85,
  0xfe94f82b, 0x3c6ef372, 0x5f1d36f1, 0xa54ff53a,
  0xade682d1, 0x510e527f, 0x2b3e6c1f, 0x9b05688c,
  0xfb41bd6b, 0x1f83d9ab, 0x137e2179, 0x5be0cd19,
]);

const SIGMA = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
  [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
  [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
  [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
  [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
  [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
  [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
  [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
  [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
] as const;

function ADD64(v: Uint32Array, a: number, b: number): void {
  const o0 = v[a]! + v[b]!;
  const o1 = v[a + 1]! + v[b + 1]! + (o0 >= 0x100000000 ? 1 : 0);
  v[a] = o0 >>> 0;
  v[a + 1] = o1 >>> 0;
}

function XOR64(v: Uint32Array, a: number, b: number): void {
  v[a] = (v[a] ?? 0) ^ (v[b] ?? 0);
  v[a + 1] = (v[a + 1] ?? 0) ^ (v[b + 1] ?? 0);
}

function ROTR64(v: Uint32Array, a: number, n: number): void {
  const lo = v[a]!;
  const hi = v[a + 1]!;
  if (n === 32) {
    v[a] = hi;
    v[a + 1] = lo;
  } else if (n < 32) {
    v[a] = (lo >>> n) | (hi << (32 - n));
    v[a + 1] = (hi >>> n) | (lo << (32 - n));
  } else {
    const s = n - 32;
    v[a] = (hi >>> s) | (lo << (32 - s));
    v[a + 1] = (lo >>> s) | (hi << (32 - s));
  }
}

function G(v: Uint32Array, m: Uint32Array, a: number, b: number, c: number, d: number, ix: number, iy: number): void {
  // a = a + b + m[ix]
  ADD64(v, a * 2, b * 2);
  v[a * 2] = (v[a * 2]! + m[ix * 2]!) >>> 0;
  const carry1 = v[a * 2]! < m[ix * 2]! ? 1 : 0;
  v[a * 2 + 1] = (v[a * 2 + 1]! + m[ix * 2 + 1]! + carry1) >>> 0;

  // d = rotr(d ^ a, 32)
  XOR64(v, d * 2, a * 2);
  ROTR64(v, d * 2, 32);

  // c = c + d
  ADD64(v, c * 2, d * 2);

  // b = rotr(b ^ c, 24)
  XOR64(v, b * 2, c * 2);
  ROTR64(v, b * 2, 24);

  // a = a + b + m[iy]
  ADD64(v, a * 2, b * 2);
  v[a * 2] = (v[a * 2]! + m[iy * 2]!) >>> 0;
  const carry2 = v[a * 2]! < m[iy * 2]! ? 1 : 0;
  v[a * 2 + 1] = (v[a * 2 + 1]! + m[iy * 2 + 1]! + carry2) >>> 0;

  // d = rotr(d ^ a, 16)
  XOR64(v, d * 2, a * 2);
  ROTR64(v, d * 2, 16);

  // c = c + d
  ADD64(v, c * 2, d * 2);

  // b = rotr(b ^ c, 63)
  XOR64(v, b * 2, c * 2);
  ROTR64(v, b * 2, 63);
}

/**
 * Compute blake2b with a 16-byte (128-bit) output.
 * This is a minimal implementation — only handles messages up to 128 bytes
 * (sufficient for our 32-byte account IDs and small asset ID encodings).
 */
export function blake2b128(input: Uint8Array): Uint8Array {
  const outlen = 16; // 128 bits

  // Initialize state h[0..7]
  const h = new Uint32Array(16);
  for (let i = 0; i < 16; i++) {
    h[i] = BLAKE2B_IV[i]!;
  }
  // Parameter block: fanout=1, depth=1, digest_length=outlen
  h[0] = (h[0] ?? 0) ^ 0x01010000 ^ outlen;

  // Pad input to 128 bytes (single block)
  const block = new Uint8Array(128);
  block.set(input);

  // Convert block to 16 uint64 words (little-endian)
  const m = new Uint32Array(32);
  for (let i = 0; i < 32; i++) {
    const offset = i * 4;
    m[i] =
      block[offset]! |
      (block[offset + 1]! << 8) |
      (block[offset + 2]! << 16) |
      (block[offset + 3]! << 24);
  }

  // Compress (single block, final)
  const v = new Uint32Array(32);
  for (let i = 0; i < 16; i++) {
    v[i] = h[i]!;
  }
  for (let i = 0; i < 16; i++) {
    v[i + 16] = BLAKE2B_IV[i]!;
  }

  // Counter: t[0] = input.length, t[1] = 0
  v[24] = (v[24] ?? 0) ^ input.length;
  // Final block flag
  v[28] = ~v[28]! >>> 0;
  v[29] = ~v[29]! >>> 0;

  // 12 rounds
  for (let round = 0; round < 12; round++) {
    const s = SIGMA[round]!;
    G(v, m, 0, 4, 8, 12, s[0]!, s[1]!);
    G(v, m, 1, 5, 9, 13, s[2]!, s[3]!);
    G(v, m, 2, 6, 10, 14, s[4]!, s[5]!);
    G(v, m, 3, 7, 11, 15, s[6]!, s[7]!);
    G(v, m, 0, 5, 10, 15, s[8]!, s[9]!);
    G(v, m, 1, 6, 11, 12, s[10]!, s[11]!);
    G(v, m, 2, 7, 8, 13, s[12]!, s[13]!);
    G(v, m, 3, 4, 9, 14, s[14]!, s[15]!);
  }

  // Finalize
  for (let i = 0; i < 16; i++) {
    h[i] = h[i]! ^ v[i]! ^ v[i + 16]!;
  }

  // Extract first `outlen` bytes (little-endian)
  const out = new Uint8Array(outlen);
  for (let i = 0; i < outlen; i++) {
    out[i] = (h[i >> 2]! >> (8 * (i & 3))) & 0xff;
  }

  return out;
}

/**
 * blake2_128_concat hasher: blake2b_128(key) ++ key
 * This is the standard Substrate storage map key hasher.
 */
export function blake2_128Concat(key: Uint8Array): string {
  const hash = blake2b128(key);
  return bytesToHex(hash) + bytesToHex(key);
}

// ---------------------------------------------------------------------------
// SCALE compact integer decoding
// ---------------------------------------------------------------------------

/**
 * Decode a SCALE compact-encoded unsigned integer from a hex string at offset.
 * Returns the decoded value as a bigint and the new offset.
 */
export function decodeCompact(data: Uint8Array, offset: number): { value: bigint; newOffset: number } {
  const mode = data[offset]! & 0b11;

  if (mode === 0b00) {
    // Single byte mode
    return { value: BigInt(data[offset]! >> 2), newOffset: offset + 1 };
  }
  if (mode === 0b01) {
    // Two-byte mode
    const val = (data[offset]! | (data[offset + 1]! << 8)) >> 2;
    return { value: BigInt(val), newOffset: offset + 2 };
  }
  if (mode === 0b10) {
    // Four-byte mode
    const val =
      (data[offset]! |
        (data[offset + 1]! << 8) |
        (data[offset + 2]! << 16) |
        (data[offset + 3]! << 24)) >>>
      2;
    return { value: BigInt(val), newOffset: offset + 4 };
  }

  // Big integer mode (0b11)
  const byteLen = (data[offset]! >> 2) + 4;
  let val = 0n;
  for (let i = 0; i < byteLen; i++) {
    val |= BigInt(data[offset + 1 + i]!) << BigInt(i * 8);
  }
  return { value: val, newOffset: offset + 1 + byteLen };
}

// ---------------------------------------------------------------------------
// Balance decoding
// ---------------------------------------------------------------------------

/** Read a little-endian u128 from bytes. */
export function readU128LE(data: Uint8Array, offset: number): bigint {
  let val = 0n;
  for (let i = 0; i < 16; i++) {
    val |= BigInt(data[offset + i]!) << BigInt(i * 8);
  }
  return val;
}

/**
 * Decode System.Account storage value → free balance (planck).
 *
 * SCALE layout of AccountInfo<Index, AccountData>:
 *   nonce:       u32  (4 bytes)
 *   consumers:   u32  (4 bytes)
 *   providers:   u32  (4 bytes)
 *   sufficients: u32  (4 bytes)
 *   data: AccountData {
 *     free:       u128 (16 bytes) ← we want this
 *     reserved:   u128 (16 bytes)
 *     frozen:     u128 (16 bytes)
 *     flags:      u128 (16 bytes)
 *   }
 *
 * Total: 4 + 4 + 4 + 4 + 4*16 = 80 bytes
 */
export function decodeSystemAccount(hexData: string): { free: bigint; reserved: bigint } {
  const bytes = hexToBytes(hexData);
  // Skip nonce(4) + consumers(4) + providers(4) + sufficients(4) = 16 bytes
  const free = readU128LE(bytes, 16);
  const reserved = readU128LE(bytes, 32);
  return { free, reserved };
}

/**
 * Decode Assets.Account storage value → balance (planck).
 *
 * SCALE layout of AssetAccount:
 *   balance:    u128 (16 bytes) ← we want this
 *   status:     enum (1 byte: 0=Liquid, 1=Frozen, 2=Blocked)
 *   reason:     enum (variable)
 *   extra:      () (0 bytes)
 */
export function decodeAssetsAccount(hexData: string): { balance: bigint } {
  const bytes = hexToBytes(hexData);
  const balance = readU128LE(bytes, 0);
  return { balance };
}

// ---------------------------------------------------------------------------
// Storage key construction
// ---------------------------------------------------------------------------

/**
 * Build the full storage key for System.Account(accountId).
 *
 * Key = twox128("System") + twox128("Account") + blake2_128_concat(accountId)
 */
export function systemAccountKey(accountId: Uint8Array): string {
  return '0x' + STORAGE_PREFIXES.systemAccount + blake2_128Concat(accountId);
}

/**
 * Build the full storage key for Assets.Account(assetId, accountId).
 *
 * Key = twox128("Assets") + twox128("Account")
 *     + blake2_128_concat(SCALE_encode(assetId))
 *     + blake2_128_concat(accountId)
 *
 * On Kreivo, the AssetId type is an enum: { Here: u32, Sibling: ..., External: ... }.
 * All local assets use the "Here" variant (index 0), so the SCALE encoding is:
 *   0x00 (variant index) + u32 little-endian (4 bytes) = 5 bytes total.
 */
export function assetsAccountKey(assetId: number, accountId: Uint8Array): string {
  // SCALE encode Enum('Here', assetId): variant 0 + u32 LE
  const assetIdBytes = new Uint8Array(5);
  assetIdBytes[0] = 0x00; // "Here" variant index
  assetIdBytes[1] = assetId & 0xff;
  assetIdBytes[2] = (assetId >> 8) & 0xff;
  assetIdBytes[3] = (assetId >> 16) & 0xff;
  assetIdBytes[4] = (assetId >> 24) & 0xff;

  return (
    '0x' +
    STORAGE_PREFIXES.assetsAccount +
    blake2_128Concat(assetIdBytes) +
    blake2_128Concat(accountId)
  );
}

// ---------------------------------------------------------------------------
// Planck → decimal string conversion
// ---------------------------------------------------------------------------

/**
 * Convert planck (smallest unit) to a human-readable decimal string.
 * @param planck - Balance in planck as bigint
 * @param decimals - Number of decimal places (KSM = 12, DUSD = 6)
 * @param displayDecimals - Number of decimal places to show (default 4)
 */
export function formatBalance(planck: bigint, decimals: number, displayDecimals = 4): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = planck / divisor;
  const remainder = planck % divisor;

  const fracStr = remainder.toString().padStart(decimals, '0').slice(0, displayDecimals);
  return `${whole}.${fracStr}`;
}
