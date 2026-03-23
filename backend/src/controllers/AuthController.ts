import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import { Request, Response } from "express";

/*

    req.body: JSON body (payload)
    req.params: URL params
    req.query: query string
    req.headers: headers

*/
export async function handleSignup(req: Request, res: Response) {

    try {

        // extract info from the HTTP payload
        const { username, email, artifacts } = req.body;

        // Validate that these fields aren't emptyy
        if (!username || !email || !artifacts) {
            return res.status(400).json({ error: "Missing signup information"});
        }

        //if username already exists, return error
        const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("username", username)
            .maybeSingle();
            
        if (existingUser) {
            return res.status(400).json({ error: "Username already exists"});
        }

        // if email already exists, return error
        const { data: existingEmail } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (existingEmail) {
            return res.status(400).json({ error: "Email already in use" });
        }

            

        const { data, error } = await supabase
            .from("users")
            .insert([
                {username,
                email,
                salt: artifacts.saltB64,
                iterations: artifacts.kdfIterations,
                wrapped_master_key: artifacts.wrappedMasterKeyB64,
                kdf: artifacts.kdf,
                cipher: artifacts.cipher,
                aes_key_length: artifacts.aesKeyLength,
                gcm_iv_length: artifacts.gcmIVLength,
                iv: artifacts.ivB64,
                version: artifacts.v} as any // temporary fix to get TS to shut up
            ]);

        // Something went wrong in the layer between here and DB
        if (error) {
            const code = (error as any).code;
            // 23505 is Postgres "unique_violation" – handle concurrent signups gracefully
            if (code === "23505") {
                return res.status(400).json({ error: "Username or email already exists"});
            }
            console.error("Supabase error:", error);
            return res.status(400).json({ error: error.message});
        }

        // account successfully stored in DB
        return res.status(201).json({ ok: true });

    } catch (e) {
        console.log("Signup error in backend/src/controllers/AuthController.ts", e);
        return res.status(500).json({ error: "Internal server error"});
    }

}

export async function handleLogin(req: Request, res: Response) {
    
    try {

        // Step 1: extract the email from the HTTP payload
        const { email } = req.body;

        // Step 2: validate that it's not empty
        if (!email) {
            return res.status(400).json({ error: "Missing login information"});
        }

        // TODO: don't return ALL info about the user, 
        // just the crypto metadata (i.e. we dont want to leak the created_at timestamp)

        // Step 3: search DB for the associated email 
        const { data: rows, error } = await supabase
            .from("users")
            .select("id, username, email, kdf, iterations, salt, cipher, iv, aes_key_length, gcm_iv_length, wrapped_master_key, version")
            .eq("email", email);

        if (error) {
             return res.status(400).json({ error: error.message });
        }

        if (!rows || rows.length === 0) {
             return res.status(404).json({ error: "User not found" });
        }

        const data = rows[0];

        // otherwise email successfully found, reply with publicly known crypto metadata
        return res.status(200).json(data);


    } catch (e) {
        console.log("Login error in backend/src/controllers/AuthController.ts", e);
        return res.status(500).json({ error: "Internal server error"});
    }

}

export async function deleteAccount(req: Request, res: Response) {

    const { username } = req.body;
	
	const { data, error } = await supabase
	.from('users')
	.delete()
	.eq('username', username); 
	
	return res.status(201).json({ ok: true });


}