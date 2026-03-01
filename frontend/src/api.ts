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
        throw new Error("Request failed -- the base URL might have changed.");
    }

    return response.json();
}