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
 *
 *  Planned DB table: `shared_notes`
 *    id              uuid  PK
 *    owner_id        uuid  FK → users.id
 *    note_title      text  — encrypted with per-share AES key, base64
 *    note_text       text  — encrypted with per-share AES key, base64
 *    iv_title_b64    text  — IV for title encryption
 *    iv_text_b64     text  — IV for text encryption
 *    note_type       text  — 'text' | 'audio' | 'image' | 'video'
 *    created_at      timestamptz
 *    updated_at      timestamptz
 */
export type SharedNote = {
    id: string;
    owner_id: string;
    note_title: string;
    note_text: string;
    iv_title_b64: string;
    iv_text_b64: string;
    note_type: NoteType;
    created_at: string;
    updated_at: string;
};

/** Per-recipient entry: holds the per-share AES key encrypted with the
 *  recipient's RSA-OAEP public key.
 *
 *  Planned DB table: `shared_note_recipients`
 *    id                       uuid  PK
 *    shared_note_id           uuid  FK → shared_notes.id
 *    recipient_id             uuid  FK → users.id
 *    encrypted_share_key_b64  text  — per-share AES key encrypted with recipient's public key
 *    permission               text  — 'read' | 'read-write'
 *    shared_at                timestamptz
 */
export type SharedNoteRecipient = {
    id: string;
    shared_note_id: string;
    recipient_id: string;
    encrypted_share_key_b64: string;
    permission: 'read' | 'read-write';
    shared_at: string;
};