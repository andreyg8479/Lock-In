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
    console.log("handleSignup reached!");

    try {

        // extract info from the HTTP payload
        const { username, email, artifacts } = req.body;

        // Validate that these fields aren't emptyy
        if (!username || !email || !artifacts) {
            return res.status(400).json({ error: "Missing signup information"});
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
                version: artifacts.v} as any // temporary fix to get TS to shut up
            ]);

        // Something went wrong in the layer between here and DB
        if (error) {
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
    console.log("handleSignup reached!");
}