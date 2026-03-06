const BASE_URL = "http://localhost:8080";

/*
    Takes in a method (verb), path (URL path), and optionally a body (JSON-formatted payload)
    and returns a JSON-formatted HTTP request ready to be sent to the server.

    Serves as a helper for other API functions after this.
*/
async function request(method: string, path: string, body?: any) {
    
    const response = await fetch(BASE_URL + path,
    { 
        method, 
        headers: {
            "Content-Type": "application/json"
        },
        body: body ? JSON.stringify(body) : undefined
    });

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

export async function uploadNote(payload: any) {
    return request("POST", "/api/vault/file", payload);
}

export async function updateNote(payload: any) {
    return request("PUT", "/api/vault/file", payload);
}

export async function deleteNote(payload: any) {
    return request("DELETE", "/api/vault/file", payload);
}

export async function requestDeleteAccount(payload: any) {
    return request("DELETE", "/api/auth/account", payload);
}

export async function uploadNote(payload: any) {
    return request("POST", "/api/vault/file", payload);
}
