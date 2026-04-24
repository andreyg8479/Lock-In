import type { EncryptedNote } from "../../shared_types/note_types";

const BASE_URL = "http://localhost:8080";

/*
    Takes in a method (verb), path (URL path), and optionally a body (JSON-formatted payload)
    and returns a JSON-formatted HTTP request ready to be sent to the server.

    Serves as a helper for other API functions after this.
*/
async function request(method: string, path: string, body?: any, token?: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    let response: Response;
    try {
        response = await fetch(BASE_URL + path, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal
        });
    } catch (err: any) {
        if (err?.name === "AbortError") {
            throw new Error("Request timed out");
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
    const errorText = await response.text();
    console.error("Backend error:", errorText);
    throw new Error(errorText);
    }

    return response.json();
}

// Client sends the username and wrapped 
export async function requestSignup(payload: any) {
    return request("POST", "/api/auth/signup", payload);
}

// Client sends the username of the account they're trying to sign into
// Server replies with publicly known login credentials of that account,
// so the client can attempt to unwrap the key
export async function requestLogin(payload: any) {
    return request("POST", "/api/auth/login", payload);
}

export async function getAllNoteNames(payload?: any) {
    return request("POST", "/api/vault/fileNames", payload);
}

export async function requestAllNoteNames(payload: any) {
    return request("POST", "/api/vault/fileNames", payload);
}

export async function getNote(payload: any) {
    return request("POST", "/api/vault/get", payload);
}

export async function uploadNote(payload: Partial<EncryptedNote>) {
    return request("POST", "/api/vault/file", payload);
}

export async function updateNote(payload: Partial<EncryptedNote>) {
    return request("PUT", "/api/vault/file", payload);
}

export async function clearNoteSecondPassword(payload: {
    noteId: string;
    user_id: string;
}) {
    return request("POST", "/api/vault/clearNoteSecondPassword", payload);
}

export async function deleteNote(payload: any) {
    return request("DELETE", "/api/vault/file", payload);
}

export async function requestDeleteAccount(payload: any) {
    return request("DELETE", "/api/auth/account", payload);
}

export async function send2fa(payload: { email: string }) {
    return request("POST", "/api/auth/2fa/send", payload);
}

export async function verify2fa(payload: { email: string; code: string }) {
    return request("POST", "/api/auth/2fa/verify", payload);
}

export async function get2faStatus(payload: { email: string }): Promise<{ twoFaEnabled: boolean }> {
    return request("POST", "/api/auth/2fa/status", payload);
}

export async function enable2fa(payload: { email: string }) {
    return request("POST", "/api/auth/2fa/enable", payload);
}

export async function disable2fa(payload: { email: string; code: string }) {
    return request("POST", "/api/auth/2fa/disable", payload);
}

// Create an authenticated session — sends auth hash, receives JWT
export async function createSession(payload: { email: string; authHashB64: string }): Promise<{ ok: boolean; token: string }> {
    return request("POST", "/api/auth/session", payload);
}

// Change the master password (requires JWT + optional 2FA code)
export async function changeMasterPasswordApi(
    payload: {
        newSaltB64: string;
        newIvB64: string;
        newWrappedMasterKeyB64: string;
        newAuthHashB64: string;
        newIterations: number;
        twoFaCode?: string;
    },
    token: string
): Promise<{ ok: boolean; token: string; requires2fa?: boolean }> {
    return request("PUT", "/api/auth/master-password", payload, token);
}


export async function notifyPasswordChangeReminder(token: string): Promise<{ ok: boolean }> {
    return request("POST", "/api/auth/password-reminder/notify", {}, token);
  }

// ─── Note sharing (E2EE) ────────────────────────────────────────────────────

/** Backfill an RSA key pair for a legacy account on its first login after
 *  the sharing rollout. Server rejects with 409 if one already exists. */
export async function uploadKeyPair(
    payload: {
        publicKeySpkiB64: string;
        encryptedPrivateKeyB64: string;
        privateKeyIvB64: string;
        asymmetricKeyAlgorithm: string;
        asymmetricKeyLength: number;
        asymmetricHash: string;
    },
    token: string
): Promise<{ ok: boolean }> {
    return request("POST", "/api/auth/keypair", payload, token);
}

export type LookupUserResponse =
    | { notFound: true }
    | { notReady: true; username: string }
    | {
          id: string;
          username: string;
          publicKeySpkiB64: string;
          asymmetricKeyAlgorithm: string;
          asymmetricKeyLength: number;
          asymmetricHash: string;
      };

export async function lookupUserByEmail(email: string, token: string): Promise<LookupUserResponse> {
    // Handle 404/409 as typed responses rather than throwing
    try {
        const data = await request(
            "GET",
            `/api/users/lookup?email=${encodeURIComponent(email)}`,
            undefined,
            token
        );
        return data as LookupUserResponse;
    } catch (e: any) {
        const msg = String(e?.message || e);
        if (msg.includes("notFound")) return { notFound: true };
        const m = msg.match(/"username"\s*:\s*"([^"]+)"/);
        if (msg.includes("notReady")) return { notReady: true, username: m?.[1] ?? "" };
        throw e;
    }
}

export type CreateSharePayload = {
    recipientId: string;
    sourceNoteId?: string;
    noteType: 'text' | 'audio' | 'image' | 'video';
    note_title: string;
    note_text: string;
    iv_text_b64: string;
    encrypted_share_key_b64: string;
    expiresAt?: string;
};

export async function createShare(
    payload: CreateSharePayload,
    token: string
): Promise<{ ok: boolean; shareId: string }> {
    return request("POST", "/api/share", payload, token);
}

export type IncomingShareSummary = {
    id: string;
    note_type: 'text' | 'audio' | 'image' | 'video';
    expires_at: string | null;
    created_at: string;
    sender_username: string;
};

export async function listIncomingShares(token: string): Promise<{ shares: IncomingShareSummary[] }> {
    return request("GET", "/api/share/incoming", undefined, token);
}

export type OutgoingShareSummary = {
    id: string;
    note_type: 'text' | 'audio' | 'image' | 'video';
    expires_at: string | null;
    created_at: string;
    source_note_id: string | null;
    recipient_username: string;
    recipient_email: string;
};

export async function listOutgoingShares(token: string): Promise<{ shares: OutgoingShareSummary[] }> {
    return request("GET", "/api/share/outgoing", undefined, token);
}

export type ShareDetail = {
    share: {
        id: string;
        owner_id: string;
        recipient_id: string;
        source_note_id: string | null;
        note_title: string;
        note_text: string;
        iv_text_b64: string;
        note_type: 'text' | 'audio' | 'image' | 'video';
        encrypted_share_key_b64: string;
        expires_at: string | null;
        created_at: string;
    };
    sender: { username: string; email: string } | null;
    viewerIsOwner: boolean;
};

export async function getShare(id: string, token: string): Promise<ShareDetail> {
    return request("GET", `/api/share/${encodeURIComponent(id)}`, undefined, token);
}

export async function deleteShare(id: string, token: string): Promise<{ ok: boolean }> {
    return request("DELETE", `/api/share/${encodeURIComponent(id)}`, undefined, token);
}