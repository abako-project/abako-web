/**
 * Computes a deterministic SHA-256 hash of scope document data.
 * This hash is stored on-chain as proof of the scope agreement.
 *
 * Uses the Web Crypto API — no external dependencies required.
 * The hash is deterministic: same milestones input always produces the same hex string.
 */
export async function computeScopeHash(milestones: Array<{
  title?: string;
  description?: string;
  budget?: string | number;
  deliveryDate?: string | number;
}>): Promise<string> {
  // Normalize each milestone to a canonical shape with sorted keys and
  // string-coerced values so the serialization is always identical for
  // the same logical input regardless of type variations at call sites.
  const normalized = milestones.map((m) => ({
    title: m.title ?? '',
    description: m.description ?? '',
    budget: String(m.budget ?? '0'),
    deliveryDate: String(m.deliveryDate ?? ''),
  }));

  const data = JSON.stringify(normalized);
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = '0x' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}
