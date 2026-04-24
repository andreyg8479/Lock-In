export type NoteType = 'text' | 'audio' | 'image' | 'video';

export type EncryptedNote = {
    user_id: string,
    id: string,
    note_title: string,
    note_text: string,
    iv_b64: string,
    pinned: boolean,
    note_type: NoteType,
    updated_at: string,
    created_at: string,
    second_password: string | null
};

export type DecryptedNote = {
    user_id: string,
    id: string,
    note_title: string,
    note_text: string,
    /** Present for audio notes when a voice transcript was generated (encrypted with the note). */
    note_transcript?: string,
    iv_b64: string,
    pinned: boolean,
    note_type: NoteType,
    updated_at: string,
    created_at: string,
    second_password: string | null
};

export type DisplayNote = DecryptedNote & {
    client: boolean
};

// ─── Asymmetric Key Pair (for E2EE note sharing) ────────────────────────────

/** RSA-OAEP key pair stored per-user.
 *  The public key is stored in plaintext; the private key is encrypted
 *  with the user's vault key (AES-GCM) so the server never sees it.
 *
 *  Planned DB columns on `users` table (all nullable for backward compat):
 *    public_key           text   — SPKI-encoded public key, base64
 *    encrypted_private_key text  — PKCS8 private key encrypted with vault key, base64
 *    private_key_iv       text   — IV used to encrypt the private key, base64
 *    asymmetric_key_algorithm text — e.g. "RSA-OAEP"
 *    asymmetric_key_length    int  — e.g. 2048
 *    asymmetric_hash      text   — e.g. "SHA-256"
 */
export type UserKeyPair = {
    public_key_spki_b64: string;
    encrypted_private_key_b64: string;
    private_key_iv_b64: string;
    asymmetric_key_algorithm: "RSA-OAEP";
    asymmetric_key_length: number;
    asymmetric_hash: "SHA-256";
};

/** Lightweight public info used when looking up a recipient for sharing. */
export type UserPublicInfo = {
    id: string;
    username: string;
    public_key_spki_b64: string | null;
};

// ─── Shared Notes (E2EE note sharing — snapshot model) ──────────────────────

/** A note encrypted with a per-share AES key (NOT the owner's vault key).
 *  The note content is a frozen snapshot taken at the time of sharing.
 *  Sharing is single-recipient — to share with multiple people, the owner
 *  creates multiple rows.
 *
 *  DB table: `shared_notes`
 *    id                      uuid  PK
 *    owner_id                uuid  FK → users.id
 *    recipient_id            uuid  FK → users.id
 *    source_note_id          uuid  nullable — informational only (no cascade)
 *    note_title              text  — packed iv+ciphertext, base64 (same convention as notes.note_title)
 *    note_text               text  — ciphertext base64, encrypted with per-share AES key
 *    iv_text_b64             text  — IV for note_text
 *    note_type               text
 *    encrypted_share_key_b64 text  — per-share AES key, RSA-OAEP-encrypted to recipient public key
 *    expires_at              timestamptz nullable
 *    created_at              timestamptz
 */
export type SharedNote = {
    id: string;
    owner_id: string;
    recipient_id: string;
    source_note_id: string | null;
    note_title: string;
    note_text: string;
    iv_text_b64: string;
    note_type: NoteType;
    encrypted_share_key_b64: string;
    expires_at: string | null;
    created_at: string;
};

/** @deprecated Not used — sharing collapsed into a single `shared_notes`
 *  table per the implemented design. Kept for reference only. */
export type SharedNoteRecipient = {
    id: string;
    shared_note_id: string;
    recipient_id: string;
    encrypted_share_key_b64: string;
    permission: 'read' | 'read-write';
    shared_at: string;
};