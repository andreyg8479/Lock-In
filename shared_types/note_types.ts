export type EncryptedNote = {
    userID: string,
    noteID: string,
    encryptedName: string,
    ciphertextB64: string,
    ivB64: string,
    pinned: boolean,
    lastModified: string,
    createdAt: string
};

export type DecryptedNote = {
    userID: string,
    id: string,
    name: string,
    plaintext: string,
    ivB64: string,
    pinned: boolean,
    lastModified: string,
    createdAt: string
};