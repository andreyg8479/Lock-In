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
            { name: "AES-GCM", iv, additionalData: aad },
            wrappingKey,
            vaultKey
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
                    wrappedMasterKeyB64: toBase64(wrapped), // convert to B64
                    v: 1
                }
            },
        };

    } catch (e) {
        return {ok: false, payload: { errorMessage: String(e) }};
    }

}

function randomBytes(n: number): Uint8Array {
    const out = new Uint8Array(n);
    crypto.getRandomValues(out);
    return out;
}

function utf8Bytes(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}

async function deriveAesGcmKeyFromPassword(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
    const baseKey = await crypto.subtle.importKey(
        "raw",
        utf8Bytes(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations,
            hash: "SHA-256"
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
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
