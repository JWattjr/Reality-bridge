export const COMMITMENT_DOMAIN = "reality-bridge-choice-v1";

/** ASCII unit separator; matches `FIELD_SEPARATOR` in the contract. */
const FIELD_SEPARATOR = "\u001f";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function subtle(): SubtleCrypto {
  const source = globalThis.crypto;
  if (!source?.subtle) {
    throw new Error(
      "This browser does not expose Web Crypto over a secure context. Reality Bridge cannot build a commitment safely here.",
    );
  }
  return source.subtle;
}

/**
 * Generate a 256-bit salt from the platform CSPRNG.
 *
 * Throws rather than falling back to `Math.random`: a predictable salt would
 * let anyone open a sealed choice before its reveal.
 */
export function generateSalt(): string {
  const source = globalThis.crypto;
  if (!source?.getRandomValues) {
    throw new Error(
      "No cryptographically secure random source is available in this browser.",
    );
  }
  const bytes = new Uint8Array(32);
  source.getRandomValues(bytes);
  return bytesToHex(bytes);
}

/**
 * Must stay byte-for-byte aligned with `_choice_commitment` in the contract.
 * The salt never leaves the browser until the player reveals.
 */
export async function choiceCommitment(params: {
  roundId: string;
  tileIndex: number;
  account: string;
  choice: "YES" | "NO";
  salt: string;
}): Promise<string> {
  const canonical = [
    COMMITMENT_DOMAIN,
    String(Number(params.roundId)),
    String(params.tileIndex),
    params.account.toLowerCase(),
    params.choice,
    params.salt,
  ].join(FIELD_SEPARATOR);
  const digest = await subtle().digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  return bytesToHex(new Uint8Array(digest));
}
