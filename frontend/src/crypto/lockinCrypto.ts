// Represents public crypto metadata associated with each account
export type SignupCryptoArtifacts = {

    kdf: "PBKDF2";
    kdfIterations: number;
    saltB64: string;
    cipher: "AES-GCM";
    ivB64: string;
    aesKeyLength: number;
    gcmIVLength: number;

    wrappedMasterKeyB64: string;

    v: 1;

    // Optional RSA-OAEP key pair fields for E2EE note sharing.
    // Present when the user's asymmetric key pair is generated (at signup or later).
    public_key_spki_b64?: string;
    encrypted_private_key_b64?: string;
    private_key_iv_b64?: string;
    asymmetric_key_algorithm?: "RSA-OAEP";
    asymmetric_key_length?: number;
    asymmetric_hash?: "SHA-256";
};

// What the signup logic gets back from lockinCrypto, i.e. successfully generated artifacts
export type OutgoingSignupData =
  | {
      ok: true;
      payload: {
        username: string;
        email: string;
        authHashB64: string;
        artifacts: SignupCryptoArtifacts;
      };
    }
  | {
      ok: false;
      payload: {
        errorMessage: string;
      };
    };


// Raw GUI fields that lockinCrypto uses to generate crypto metadata
export type IncomingSignupData = {

    username: string,
    email: string, 
    password: string

};

// Sent by login logic to lockinCrypto to attempt to unwrap the vault key  
export type IncomingLoginData = {
    email: string
    username: string;
    attemptedPassword: string;
    artifacts: SignupCryptoArtifacts;
};

// What the login logic gets back from lockinCrypto upon successful sign-in
// the vaultKey is the actual key used to encrypt and decrypt files and never leaves the client
export type OutgoingLoginData =
  | {
      ok: true;
      payload: {
        vaultKey: CryptoKey;
      };
    }
  | {
      ok: false;
      payload: {
        errorMessage: string;
      };
    };

const PDKDF2_ITERATIONS = 310_000; // may be a bit too high, so we can tweak this as needed
const SALT_LEN = 16; // bytes
const IV_LEN = 12; // bytes (96 bits) for AES-GCM
const MASTER_KEY_LEN = 32; // bytes for AES-256 (256 bits)

// RSA-OAEP constants for E2EE note sharing (not yet used in any functions)
export const RSA_KEY_LENGTH = 2048;
export const RSA_HASH = "SHA-256";
export const RSA_ALGORITHM = "RSA-OAEP";

// Generate the crypto metadata to be associated with this account
export async function generateSignupCredentials(data: IncomingSignupData): Promise<OutgoingSignupData> {

    try {

        // use randomBytes for TRNG SECURE random bytes
        const salt = randomBytes(SALT_LEN);
        const iv = randomBytes(IV_LEN);

        // Step 1: Derive wrapping key from password
        const wrappingKey = await deriveAesGcmKeyFromPassword(data.password, salt, PDKDF2_ITERATIONS);

        // Bind the wrapping key to the username and email
        const aad = utf8Bytes(`${data.username}\n${data.email}`);

        // Step 2: generate the vault key
        const vaultKey = randomBytes(MASTER_KEY_LEN);

        // Step 3: Wrap the vault key using AES-GCM with the derived wrapping key
        const wrapped = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: toArrayBuffer(iv), additionalData: toArrayBuffer(aad) },
            wrappingKey, // "key"
            toArrayBuffer(vaultKey) // "data"
        );

        // Step 4: Derive auth hash for server-side password verification
        const authHashB64 = await deriveAuthHash(data.password, salt, PDKDF2_ITERATIONS);

        return {
            ok: true,
            payload: {
                username: data.username,
                email: data.email,
                authHashB64,
                artifacts: {
                    kdf: "PBKDF2",
                    kdfIterations: PDKDF2_ITERATIONS,
                    saltB64: toBase64(salt), // convert to B64
                    cipher: "AES-GCM",
                    ivB64: toBase64(iv), // convert to B64
                    aesKeyLength: MASTER_KEY_LEN * 8, // bits
                    gcmIVLength: IV_LEN,
                    wrappedMasterKeyB64: toBase64(new Uint8Array(wrapped)), // convert to B64
                    v: 1
                }
            },
        };

    } catch (e) {
        return {ok: false, payload: { errorMessage: String(e) }};
    }

}

// Attempt to unwrap the wrapped master key, given to the client by the server
export async function handleLogin(data: IncomingLoginData): Promise<OutgoingLoginData> {
    try {
        const { username, email, attemptedPassword, artifacts } = data;
        
        // Ensure supported KDF and Cipher
        if (artifacts.kdf !== "PBKDF2" || artifacts.cipher !== "AES-GCM") {
            throw new Error("Unsupported KDF or cipher");
        }

        const salt = fromBase64(artifacts.saltB64);
        const iv = fromBase64(artifacts.ivB64);
        const wrappedMasterKey = fromBase64(artifacts.wrappedMasterKeyB64);

        // Step 1: Derive wrapping key from password
        const wrappingKey = await deriveAesGcmKeyFromPassword(attemptedPassword, salt, artifacts.kdfIterations);

        // Bind the wrapping key to the username and email
        const aad = utf8Bytes(`${username}\n${email}`);

        // Step 2: Unwrap the vault key using AES-GCM with the derived wrapping key
        const vaultKeyBuffer = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: toArrayBuffer(iv), additionalData: toArrayBuffer(aad) },
            wrappingKey,
            toArrayBuffer(wrappedMasterKey)
        );

        // Convert raw bytes back to CryptoKey
        const vaultKey = await window.crypto.subtle.importKey(
            "raw", 
            vaultKeyBuffer,
            "AES-GCM", 
            true, 
            ["encrypt", "decrypt"]
        );

        return {
            ok: true,
            payload: {
                vaultKey: vaultKey
            }
        };

    } catch {
        return { ok: false, payload: { errorMessage: "Failed to unlock vault. Incorrect password or corrupted data." } };
    }
}

// Wrapper for the Web Crypto API -- derives the true key from the password (but I dont think its derives directly for now)
async function deriveAesGcmKeyFromPassword(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
    const baseKey = await window.crypto.subtle.importKey(
        "raw",
        toArrayBuffer(utf8Bytes(password)),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: toArrayBuffer(salt),
            iterations,
            hash: "SHA-256"
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

import type { EncryptedNote, DecryptedNote } from "../../../shared_types/note_types"

/** v1: audio bytes as base64 + optional transcript, packed as JSON UTF-8 before encryption. */
const AUDIO_PAYLOAD_V1 = 1

function isAudioWithTranscript(note: DecryptedNote): boolean {
    return (
        note.note_type === "audio" &&
        typeof note.note_transcript === "string" &&
        note.note_transcript.length > 0
    );
}

export async function encryptNote(uploadedNote: DecryptedNote, vaultKey: CryptoKey): Promise<EncryptedNote> {

    // Step 1: Generate a new random IV (this will never be reused anywhere for security)
    const iv = randomBytes(IV_LEN);

    // Step 2: encrypt the note content
    // For audio/image, note_text is a base64 string of raw binary — decode to raw bytes
    // before encrypting to avoid encrypting the ~33% inflated base64 representation.
    // For text, encode as UTF-8 bytes.
    // For audio with a transcript, pack audio + transcript as JSON (v1) and UTF-8 encode.
    const contentBuffer = uploadedNote.note_type === 'text'
        ? utf8Bytes(uploadedNote.note_text)
        : isAudioWithTranscript(uploadedNote)
        ? utf8Bytes(JSON.stringify({
            v: AUDIO_PAYLOAD_V1,
            a: uploadedNote.note_text,
            t: uploadedNote.note_transcript,
          }))
        : fromBase64(uploadedNote.note_text);

    const ciphertextBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: toArrayBuffer(iv) },
        vaultKey,
        toArrayBuffer(contentBuffer)
    );

    // Step 3: encrypt the name, with a separate IV to prevent reuse
    const nameIv = randomBytes(IV_LEN);
    const nameBuffer = utf8Bytes(uploadedNote.note_title);

    const encryptedNameBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: toArrayBuffer(nameIv) },
        vaultKey,
        toArrayBuffer(nameBuffer)
    );

    // Step 4: Pack the name and IV together (we could make it a separate field later
    // for but now this works)
    const combinedName = new Uint8Array(nameIv.length + encryptedNameBuffer.byteLength);
    combinedName.set(nameIv);
    combinedName.set(new Uint8Array(encryptedNameBuffer), nameIv.length);

    return {
        user_id: uploadedNote.user_id,
        id: uploadedNote.id,
        note_title: toBase64(combinedName),
        note_text: toBase64(new Uint8Array(ciphertextBuffer)),
        iv_b64: toBase64(iv),
        pinned: uploadedNote.pinned,
        note_type: uploadedNote.note_type,
        updated_at: uploadedNote.updated_at,
        created_at: uploadedNote.created_at,
        second_password: uploadedNote.second_password
    };
}

export async function decryptNote(encryptedNote: EncryptedNote, vaultKey: CryptoKey): Promise<DecryptedNote> {
    
    // Step 1: extract the IV and ciphertext and decrypt
    const iv = fromBase64(encryptedNote.iv_b64);
    const ciphertext = fromBase64(encryptedNote.note_text);

    const plaintextBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: toArrayBuffer(iv) },
        vaultKey,
        toArrayBuffer(ciphertext)
    );

    // For audio with transcript (v1), plaintext is JSON UTF-8; for other binary types, re-encode to base64.
    // For text, decode as UTF-8 string.
    let noteText: string
    let noteTranscript: string | undefined
    if (encryptedNote.note_type === 'text') {
        noteText = new TextDecoder().decode(plaintextBuffer);
        noteTranscript = undefined
    } else if (encryptedNote.note_type === 'audio') {
        const bytes = new Uint8Array(plaintextBuffer);
        if (bytes.length > 0 && bytes[0] === 0x7b) {
            try {
                const obj = JSON.parse(new TextDecoder().decode(bytes)) as { v?: number; a?: string; t?: string }
                if (obj && obj.v === AUDIO_PAYLOAD_V1 && typeof obj.a === "string") {
                    noteText = obj.a
                    noteTranscript = typeof obj.t === "string" ? obj.t : undefined
                } else {
                    noteText = toBase64(bytes);
                    noteTranscript = undefined
                }
            } catch {
                noteText = toBase64(bytes);
                noteTranscript = undefined
            }
        } else {
            noteText = toBase64(bytes);
            noteTranscript = undefined
        }
    } else {
        noteText = toBase64(new Uint8Array(plaintextBuffer));
        noteTranscript = undefined
    }

    // Step 2: decrypt the file name
    const combinedName = fromBase64(encryptedNote.note_title);
    const nameIv = combinedName.slice(0, IV_LEN);
    const encryptedName = combinedName.slice(IV_LEN);

    const nameBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: toArrayBuffer(nameIv) },
        vaultKey,
        toArrayBuffer(encryptedName)
    );

    const name = new TextDecoder().decode(nameBuffer);

    return {
        user_id: encryptedNote.user_id,
        id: encryptedNote.id,
        note_title: name,
        note_text: noteText,
        ...(noteTranscript !== undefined ? { note_transcript: noteTranscript } : {}),
        iv_b64: encryptedNote.iv_b64,
        pinned: encryptedNote.pinned,
        note_type: encryptedNote.note_type,
        updated_at: encryptedNote.updated_at,
        created_at: encryptedNote.created_at,
        second_password: encryptedNote.second_password
    };
}

export async function decryptFilenames(encryptedFilenames: string[], vaultKey: CryptoKey): Promise<string[]> {
    
    // Will keep track of the filenames decrypted so far
    const decryptedNames: string[] = [];

    // Loop over the encrypted filenames and decrypt them
    // we will need to update this logic if we decide to separate name iv in the type 
    for (const encryptedNameB64 of encryptedFilenames) {
        try {
            const combinedName = fromBase64(encryptedNameB64);
            const iv = combinedName.slice(0, IV_LEN);
            const ciphertext = combinedName.slice(IV_LEN);

            const nameBuffer = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: toArrayBuffer(iv) },
                vaultKey,
                toArrayBuffer(ciphertext)
            );

            decryptedNames.push(new TextDecoder().decode(nameBuffer));
        } catch (e) {
            console.error("Failed to decrypt filename:", e);
            // Push placeholder for now
            decryptedNames.push("[Decryption Failed]");
        }
    }

    return decryptedNames;
}

// ---------------------------------------------------------------------------
// Auth hash – server-side verifiable proof-of-password (Bitwarden-style).
// Derives the same 256-bit master key via PBKDF2, then hashes it once more
// with the original password as salt (1 iteration) to produce a value the
// server can store (and later compare) without ever seeing the vault key.
// ---------------------------------------------------------------------------
export async function deriveAuthHash(
    password: string,
    salt: Uint8Array,
    iterations: number
): Promise<string> {
    // Step 1 – derive the same master-key bits that deriveAesGcmKeyFromPassword uses
    const baseKey = await crypto.subtle.importKey(
        "raw",
        toArrayBuffer(utf8Bytes(password)),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
    );
    const masterKeyBits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt: toArrayBuffer(salt), iterations, hash: "SHA-256" },
        baseKey,
        256
    );

    // Step 2 – one extra PBKDF2 round: masterKey as key-material, password as salt
    const authBase = await crypto.subtle.importKey(
        "raw",
        masterKeyBits,
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
    );
    const authBits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: toArrayBuffer(utf8Bytes(password)),
            iterations: 1,
            hash: "SHA-256",
        },
        authBase,
        256
    );

    return toBase64(new Uint8Array(authBits));
}

// ---------------------------------------------------------------------------
// Re-wrap vault key – used when changing the master password.
// The vault key itself stays the same so no note re-encryption is needed.
// Returns new artifacts (salt, iv, wrappedMasterKeyB64) + new auth hash.
// ---------------------------------------------------------------------------
export type PasswordChangeResult =
    | {
          ok: true;
          payload: {
              newSaltB64: string;
              newIvB64: string;
              newWrappedMasterKeyB64: string;
              newAuthHashB64: string;
              newIterations: number;
          };
      }
    | { ok: false; payload: { errorMessage: string } };

export async function rewrapVaultKey(
    oldPassword: string,
    newPassword: string,
    username: string,
    email: string,
    currentArtifacts: SignupCryptoArtifacts
): Promise<PasswordChangeResult> {
    try {
        // --- Unwrap with old password ---
        const oldSalt = fromBase64(currentArtifacts.saltB64);
        const oldIv = fromBase64(currentArtifacts.ivB64);
        const oldWrapped = fromBase64(currentArtifacts.wrappedMasterKeyB64);

        const oldWrappingKey = await deriveAesGcmKeyFromPassword(
            oldPassword,
            oldSalt,
            currentArtifacts.kdfIterations
        );
        const aad = utf8Bytes(`${username}\n${email}`);

        const vaultKeyBytes = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: toArrayBuffer(oldIv), additionalData: toArrayBuffer(aad) },
            oldWrappingKey,
            toArrayBuffer(oldWrapped)
        );

        // --- Re-wrap with new password ---
        const newSalt = randomBytes(SALT_LEN);
        const newIv = randomBytes(IV_LEN);

        const newWrappingKey = await deriveAesGcmKeyFromPassword(
            newPassword,
            newSalt,
            PDKDF2_ITERATIONS
        );

        const newWrapped = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: toArrayBuffer(newIv), additionalData: toArrayBuffer(aad) },
            newWrappingKey,
            vaultKeyBytes
        );

        // --- Derive new auth hash ---
        const newAuthHashB64 = await deriveAuthHash(newPassword, newSalt, PDKDF2_ITERATIONS);

        return {
            ok: true,
            payload: {
                newSaltB64: toBase64(newSalt),
                newIvB64: toBase64(newIv),
                newWrappedMasterKeyB64: toBase64(new Uint8Array(newWrapped)),
                newAuthHashB64,
                newIterations: PDKDF2_ITERATIONS,
            },
        };
    } catch {
        return {
            ok: false,
            payload: { errorMessage: "Failed to re-wrap vault key. Old password may be incorrect." },
        };
    }
}

export async function encryptSecondPassword(password: string, vaultKey: CryptoKey): Promise<string> {
    const iv = randomBytes(IV_LEN);
    const passwordBytes = utf8Bytes(password);

    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: toArrayBuffer(iv) },
        vaultKey,
        toArrayBuffer(passwordBytes)
    );

    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return toBase64(combined);
}

export async function decryptSecondPassword(encryptedB64: string, vaultKey: CryptoKey): Promise<string> {
    const combined = fromBase64(encryptedB64);
    const iv = combined.slice(0, IV_LEN);
    const ciphertext = combined.slice(IV_LEN);

    const plaintextBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: toArrayBuffer(iv) },
        vaultKey,
        toArrayBuffer(ciphertext)
    );

    return new TextDecoder().decode(plaintextBuffer);
}

export async function verifySecondPassword(attempt: string, encryptedB64: string, vaultKey: CryptoKey): Promise<boolean> {
    try {
        const stored = await decryptSecondPassword(encryptedB64, vaultKey);
        return attempt === stored;
    } catch {
        return false;
    }
}

/*  Generate cryptographically-secure random bytes
    For use in generating salts and IVs
*/
function randomBytes(n: number): Uint8Array {
    const out = new Uint8Array(n);
    crypto.getRandomValues(out);
    return out;
}

const TWO_FA_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const TWO_FA_LENGTH = 6;

export function generate2faCode(): string {
    const bytes = randomBytes(TWO_FA_LENGTH);
    let code = "";
    for (let i = 0; i < TWO_FA_LENGTH; i++) {
        code += TWO_FA_CHARS[bytes[i] % TWO_FA_CHARS.length];
    }
    return code;
}

// convert string to an array of utf8 encoded bytes (ex: ABC becomes 65, 66, 67)
function utf8Bytes(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}

// Convert a Uint8Array to an ArrayBuffer
function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
    return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

// convert ui8 bytes to string
function toBase64(bytes: Uint8Array): string {
    // browser's btoa works on strings, so we need to convert bytes to a binary string first
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// convert string to ui8 bytes
export function fromBase64(b64: string): Uint8Array {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
