export type EncryptedNote = {
    userID: string,
    noteID: string,
    encryptedName: string,
    ciphertextB64: string,
    ivB64: string,
    pinned: boolean
    created_at: Date,
    modified_at: Date
};

export type DecryptedNote = {
    userID: string,
    id: string,
    name: string,
    plaintext: string,
    ivB64: string,
    pinned: boolean
    created_at: Date,
    modified_at: Date
};