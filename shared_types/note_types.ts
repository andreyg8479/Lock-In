export type NoteType = 'text' | 'audio' | 'image';

export type EncryptedNote = {
    user_id: string,
    id: string,
    note_title: string,
    note_text: string,
    iv_b64: string,
    pinned: boolean,
    note_type: NoteType,
    updated_at: string,
    created_at: string
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
    created_at: string
};

export type DisplayNote = DecryptedNote & {
    client: boolean
};