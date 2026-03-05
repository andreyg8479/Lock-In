export type EncryptedNote = {
    userID: string,
    noteID: string,
    encryptedName: string,
    ciphertextB64: string,
    ivB64: string,
    pinned: boolean
};

export type DecryptedNote = {
    userID: string,
    id: string,
    name: string,
    plaintext: string,
    ivB64: string,
    pinned: boolean
};