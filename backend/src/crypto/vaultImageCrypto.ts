import { randomBytes, webcrypto } from "node:crypto";

const subtle = webcrypto.subtle;

/** Matches `lockinCrypto.ts` — AES-GCM with 12-byte IV for AES-256. */
export const IV_LEN = 12;
const MASTER_KEY_LEN = 32;

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export function fromBase64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

/**
 * Optional 32-byte AES-256 key (base64) for server-side encryption of plaintext
 * image uploads. Same algorithm as the vault (AES-256-GCM); different key material.
 * Client-side vault encryption does not use this — send `image_ciphertext_b64` instead.
 */
export function getOptionalImageEncryptionKeyBytes(): Uint8Array | null {
  const raw = process.env.IMAGE_ENCRYPTION_MASTER_KEY;
  if (!raw) return null;
  try {
    const k = fromBase64(raw.trim());
    if (k.length !== MASTER_KEY_LEN) return null;
    return k;
  } catch {
    return null;
  }
}

/**
 * Encrypt arbitrary bytes with AES-256-GCM (same parameters as `encryptNote` body in lockinCrypto).
 */
export async function encryptBinaryBytes(
  plaintext: Uint8Array,
  keyBytes: Uint8Array
): Promise<{ ivB64: string; ciphertextB64: string }> {
  if (keyBytes.length !== MASTER_KEY_LEN) {
    throw new Error("AES-256 key must be 32 bytes");
  }
  const iv = randomBytes(IV_LEN);
  const keyBuf = Buffer.from(keyBytes);
  const plainBuf = Buffer.from(plaintext);
  const cryptoKey = await subtle.importKey(
    "raw",
    keyBuf,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const ciphertext = await subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    plainBuf
  );
  return {
    ivB64: toBase64(new Uint8Array(iv)),
    ciphertextB64: toBase64(new Uint8Array(ciphertext)),
  };
}

/**
 * Decrypt bytes produced by `encryptBinaryBytes` or by the browser vault (same format).
 */
export async function decryptBinaryBytes(
  ciphertextB64: string,
  ivB64: string,
  keyBytes: Uint8Array
): Promise<Uint8Array> {
  if (keyBytes.length !== MASTER_KEY_LEN) {
    throw new Error("AES-256 key must be 32 bytes");
  }
  const iv = Buffer.from(fromBase64(ivB64));
  if (iv.length !== IV_LEN) {
    throw new Error("Invalid IV length");
  }
  const cipherBuf = Buffer.from(fromBase64(ciphertextB64));
  const keyBuf = Buffer.from(keyBytes);
  const cryptoKey = await subtle.importKey(
    "raw",
    keyBuf,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const plaintext = await subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    cipherBuf
  );
  return new Uint8Array(plaintext);
}
