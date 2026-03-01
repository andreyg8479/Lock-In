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
};

export type OutgoingSignupData =
  | {
      ok: true;
      payload: {
        username: string;
        email: string;
        artifacts: SignupCryptoArtifacts;
      };
    }
  | {
      ok: false;
      payload: {
        errorMessage: string;
      };
    };



export type IncomingSignupData = {

    username: string,
    email: string, 
    password: string

};

export type IncomingLoginData = {
    username: string;
    email: string;
    password: string;
    artifacts: SignupCryptoArtifacts;
};

export type OutgoingLoginData =
  | {
      ok: true;
      payload: {
        vaultKey: Uint8Array;
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

export async function handleSignup(data: IncomingSignupData): Promise<OutgoingSignupData> {

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

        return {
            ok: true,
            payload: {
                username: data.username,
                email: data.email,
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

export async function handleLogin(data: IncomingLoginData): Promise<OutgoingLoginData> {
    try {
        const { username, email, password, artifacts } = data;
        
        // Ensure supported KDF and Cipher
        if (artifacts.kdf !== "PBKDF2" || artifacts.cipher !== "AES-GCM") {
            throw new Error("Unsupported KDF or cipher");
        }

        const salt = fromBase64(artifacts.saltB64);
        const iv = fromBase64(artifacts.ivB64);
        const wrappedMasterKey = fromBase64(artifacts.wrappedMasterKeyB64);

        // Step 1: Derive wrapping key from password
        const wrappingKey = await deriveAesGcmKeyFromPassword(password, salt, artifacts.kdfIterations);

        // Bind the wrapping key to the username and email
        const aad = utf8Bytes(`${username}\n${email}`);

        // Step 2: Unwrap the vault key using AES-GCM with the derived wrapping key
        const vaultKeyBuffer = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: toArrayBuffer(iv), additionalData: toArrayBuffer(aad) },
            wrappingKey,
            toArrayBuffer(wrappedMasterKey)
        );

        return {
            ok: true,
            payload: {
                vaultKey: new Uint8Array(vaultKeyBuffer)
            }
        };

    } catch (e) {
        return { ok: false, payload: { errorMessage: "Failed to unlock vault. Incorrect password or corrupted data." } };
    }
}

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

/*
    TODO:
    1) Function for uploading and encrypting a file
    2) Function for decrypting a recieved file
    3) Function for decrypting the users' filenames

*/

/*  Generate cryptographically-secure random bytes
    For use in generating salts and IVs
*/
function randomBytes(n: number): Uint8Array {
    const out = new Uint8Array(n);
    crypto.getRandomValues(out);
    return out;
}

function utf8Bytes(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}

// Convert a Uint8Array to an ArrayBuffer
function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
    return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

function toBase64(bytes: Uint8Array): string {
    // browser's btoa works on strings, so we need to convert bytes to a binary string first
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function fromBase64(b64: string): Uint8Array {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
