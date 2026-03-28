/**
 * Ed25519 signing pipeline for Pacifica API requests.
 *
 * Note: We use a simple mock for demo purposes when no valid key is configured.
 */

import { createHash } from "node:crypto";
import bs58 from "bs58";
import { config } from "../config.js";

// Lazy import ed25519 to set up sha512Sync first
let _ed25519: typeof import("@noble/ed25519") | null = null;
let _ed25519Promise: Promise<typeof import("@noble/ed25519")> | null = null;

async function getEd25519Async() {
  if (!_ed25519Promise) {
    _ed25519Promise = (async () => {
      const ed = await import("@noble/ed25519");
      // Set up sha512Sync for noble-ed25519
      (ed as any).sha512Sync = (...msgs: Uint8Array[]) => {
        const h = createHash("sha512");
        for (const msg of msgs) h.update(msg);
        return new Uint8Array(h.digest());
      };
      return ed;
    })();
  }
  return _ed25519Promise;
}

let _privateKey: Uint8Array | null = null;

/**
 * Decode the base58-encoded private key from env.
 * Pacifica keys are 64-byte Solana keypairs (32-byte seed + 32-byte pubkey).
 * We extract the first 32 bytes as the Ed25519 seed.
 */
function getPrivateKey(): Uint8Array {
  if (_privateKey) return _privateKey;

  const raw = bs58.decode(config.pacificaPrivateKey);
  if (raw.length === 64) {
    // Solana keypair format: first 32 bytes = seed
    _privateKey = raw.slice(0, 32);
  } else if (raw.length === 32) {
    _privateKey = raw;
  } else {
    throw new Error(
      `Invalid PACIFICA_PRIVATE_KEY length: expected 32 or 64 bytes, got ${raw.length}`
    );
  }
  return _privateKey;
}

/**
 * Build the signing string from instruction, params, timestamp, and window.
 */
export function buildSigningString(
  instruction: string,
  params: Record<string, string | number | boolean>,
  timestamp: number,
  window: number
): string {
  // Sort params alphabetically and build query string
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const parts = [`instruction=${instruction}`];
  if (sorted) parts.push(sorted);
  parts.push(`timestamp=${timestamp}`);
  parts.push(`window=${window}`);

  return parts.join("&");
}

/**
 * Sign a request and return the base64-encoded Ed25519 signature.
 */
export async function signRequest(
  instruction: string,
  params: Record<string, string | number | boolean>,
  timestamp: number,
  window: number
): Promise<string> {
  const message = buildSigningString(instruction, params, timestamp, window);
  const messageBytes = new TextEncoder().encode(message);
  const privateKey = getPrivateKey();
  const ed25519 = await getEd25519Async();

  const signature = ed25519.sign(messageBytes, privateKey);
  return Buffer.from(signature).toString("base64");
}

/**
 * Get the base64-encoded public key for the API key header.
 */
export async function getApiKey(): Promise<string> {
  const privateKey = getPrivateKey();
  const ed25519 = await getEd25519Async();
  const publicKey = ed25519.getPublicKey(privateKey);
  return Buffer.from(publicKey).toString("base64");
}
