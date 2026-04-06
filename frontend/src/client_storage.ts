import type { EncryptedNote } from "../../shared_types/note_types";

const DB_NAME = "LockInDB";
const STORE_NAME = "notes";
const DB_VERSION = 1;

// Initialize the database
export function initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error("IndexedDB error:", request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };
    });
}

// Save an encrypted note to the database
export async function saveNoteClient(note: EncryptedNote): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(note);

        request.onerror = () => {
            console.error("Error saving note:", request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve();
        };
    });
}

// Get a specific encrypted note by ID
export async function getNoteClient(id: string): Promise<EncryptedNote | undefined> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onerror = () => {
            console.error("Error retrieving note:", request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve(request.result as EncryptedNote);
        };
    });
}

// Get all encrypted notes
export async function getAllNotesClient(): Promise<EncryptedNote[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onerror = () => {
            console.error("Error retrieving all notes:", request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve(request.result as EncryptedNote[]);
        };
    });
}

// Delete a note by ID
export async function deleteNoteClient(id: string): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onerror = () => {
            console.error("Error deleting note:", request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve();
        };
    });
}
