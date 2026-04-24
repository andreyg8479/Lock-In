import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import { Request, Response } from "express";
import { signToken } from "../utils/jwt";
import { verify2faCode, sendPasswordChangeReminderEmail } from "../email/emailService";

/*

    req.body: JSON body (payload)
    req.params: URL params
    req.query: query string
    req.headers: headers

*/
export async function handleSignup(req: Request, res: Response) {

    try {

        // extract info from the HTTP payload
        const { username, email, artifacts, authHashB64 } = req.body;

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
                version: artifacts.v,
                auth_hash_b64: authHashB64 || null,
                two_fa_enabled: true,
                // RSA-OAEP key pair for E2EE note sharing (nullable for older accounts)
                public_key: artifacts.public_key_spki_b64 || null,
                encrypted_private_key: artifacts.encrypted_private_key_b64 || null,
                private_key_iv: artifacts.private_key_iv_b64 || null,
                asymmetric_key_algorithm: artifacts.asymmetric_key_algorithm || null,
                asymmetric_key_length: artifacts.asymmetric_key_length || null,
                asymmetric_hash: artifacts.asymmetric_hash || null} as any // temporary fix to get TS to shut up
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

        // Step 3: search DB for the associated email 
        const { data: rows, error } = await supabase
            .from("users")
            .select("id, username, email, kdf, iterations, salt, cipher, iv, aes_key_length, gcm_iv_length, wrapped_master_key, version, two_fa_enabled, auth_hash_b64, public_key, encrypted_private_key, private_key_iv, asymmetric_key_algorithm, asymmetric_key_length, asymmetric_hash")
            .eq("email", email);

        if (error) {
             return res.status(400).json({ error: error.message });
        }

        if (!rows || rows.length === 0) {
             return res.status(404).json({ error: "User not found" });
        }

        const data = rows[0];

        // Don't send the stored auth hash to the client – only indicate whether one exists
        const hasAuthHash = !!data.auth_hash_b64;
        const { auth_hash_b64: _removed, ...publicData } = data;

        return res.status(200).json({ ...publicData, hasAuthHash });


    } catch (e) {
        console.log("Login error in backend/src/controllers/AuthController.ts", e);
        return res.status(500).json({ error: "Internal server error"});
    }

}

/**
 * POST /api/auth/session
 * Client proves password knowledge by sending the auth hash.
 * Server verifies it and issues a JWT.
 * For existing users without an auth hash (migration), the first call stores it (TOFU).
 */
export async function createSession(req: Request, res: Response) {
    try {
        const { email, authHashB64 } = req.body;

        if (!email || !authHashB64) {
            return res.status(400).json({ error: "email and authHashB64 are required" });
        }

        const { data: rows, error } = await supabase
            .from("users")
            .select("id, email, auth_hash_b64")
            .eq("email", email);

        if (error) return res.status(400).json({ error: error.message });
        if (!rows || rows.length === 0) return res.status(404).json({ error: "User not found" });

        const user = rows[0];

        if (user.auth_hash_b64) {
            // Verify the auth hash matches (constant-time compare would be ideal,
            // but since both sides are base64 of 256-bit PBKDF2 output this is acceptable)
            if (user.auth_hash_b64 !== authHashB64) {
                return res.status(401).json({ error: "Invalid credentials" });
            }
        } else {
            // TOFU migration: store the auth hash for the first time
            const { error: updateErr } = await supabase
                .from("users")
                .update({ auth_hash_b64: authHashB64 } as any)
                .eq("id", user.id);

            if (updateErr) {
                return res.status(500).json({ error: "Failed to store auth hash" });
            }
        }

        const token = signToken({ userId: user.id, email: user.email });
        return res.status(200).json({ ok: true, token });
    } catch (e) {
        console.error("Session creation error:", e);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * PUT /api/auth/master-password
 * Changes the master password by replacing the wrapping artifacts.
 * Requires valid JWT. If 2FA is enabled, requires a valid 2FA code.
 */
export async function changeMasterPassword(req: Request, res: Response) {
    try {
        const userId = req.user?.userId;
        const userEmail = req.user?.email;

        if (!userId || !userEmail) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const {
            newSaltB64,
            newIvB64,
            newWrappedMasterKeyB64,
            newAuthHashB64,
            newIterations,
            twoFaCode,
        } = req.body;

        // Validate required fields
        if (!newSaltB64 || !newIvB64 || !newWrappedMasterKeyB64 || !newAuthHashB64 || !newIterations) {
            return res.status(400).json({ error: "Missing required password change fields" });
        }

        // Fetch user to check 2FA status
        const { data: rows, error: fetchErr } = await supabase
            .from("users")
            .select("id, two_fa_enabled")
            .eq("id", userId);

        if (fetchErr) return res.status(500).json({ error: fetchErr.message });
        if (!rows || rows.length === 0) return res.status(404).json({ error: "User not found" });

        const user = rows[0];

        // If 2FA is enabled, require a valid code
        if (user.two_fa_enabled) {
            if (!twoFaCode) {
                return res.status(400).json({ error: "2FA code is required", requires2fa: true });
            }
            const result = verify2faCode(userEmail, twoFaCode);
            if (!result.ok) {
                return res.status(401).json({ error: "Invalid 2FA code", requires2fa: true });
            }
        }

        // Update the wrapping artifacts + auth hash
        const { error: updateErr } = await supabase
            .from("users")
            .update({
                salt: newSaltB64,
                iv: newIvB64,
                wrapped_master_key: newWrappedMasterKeyB64,
                auth_hash_b64: newAuthHashB64,
                iterations: newIterations,
            } as any)
            .eq("id", userId);

        if (updateErr) {
            return res.status(500).json({ error: "Failed to update password" });
        }

        // Issue a fresh token (old one remains valid until expiry, which is fine)
        const token = signToken({ userId, email: userEmail });
        return res.status(200).json({ ok: true, token });
    } catch (e) {
        console.error("Password change error:", e);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * Sends a Resend email to the signed-in user when their client-side rotation interval is due.
 */
export async function sendPasswordChangeReminder(req: Request, res: Response) {
    const userEmail = req.user?.email;
    if (!userEmail) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const result = await sendPasswordChangeReminderEmail(userEmail);
    if (!result.ok) {
        return res.status(500).json({ error: result.error || "Failed to send reminder email" });
    }
    return res.status(200).json({ ok: true });
}

export async function deleteAccount(req: Request, res: Response) {

    const { username } = req.body;
	
	const { data, error } = await supabase
	.from('users')
	.delete()
	.eq('username', username); 
	
	return res.status(201).json({ ok: true });


}

/**
 * POST /api/auth/keypair
 * One-time backfill of RSA-OAEP key pair for legacy accounts created before
 * the sharing feature. Fails if a public key is already set — callers should
 * skip this endpoint when `public_key` came back non-null at login.
 *
 * Body: {
 *   publicKeySpkiB64,
 *   encryptedPrivateKeyB64,
 *   privateKeyIvB64,
 *   asymmetricKeyAlgorithm,
 *   asymmetricKeyLength,
 *   asymmetricHash,
 * }
 */
export async function uploadKeyPair(req: Request, res: Response) {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const {
            publicKeySpkiB64,
            encryptedPrivateKeyB64,
            privateKeyIvB64,
            asymmetricKeyAlgorithm,
            asymmetricKeyLength,
            asymmetricHash,
        } = req.body ?? {};

        if (
            !publicKeySpkiB64 ||
            !encryptedPrivateKeyB64 ||
            !privateKeyIvB64 ||
            typeof publicKeySpkiB64 !== "string" ||
            typeof encryptedPrivateKeyB64 !== "string" ||
            typeof privateKeyIvB64 !== "string"
        ) {
            return res.status(400).json({ error: "Missing key-pair fields" });
        }

        // Refuse to overwrite an existing key pair — that would silently
        // invalidate every incoming share currently encrypted to the old key.
        const { data: rows, error: fetchErr } = await supabase
            .from("users")
            .select("public_key")
            .eq("id", userId);

        if (fetchErr) return res.status(500).json({ error: fetchErr.message });
        if (!rows || rows.length === 0) return res.status(404).json({ error: "User not found" });
        if (rows[0].public_key) {
            return res.status(409).json({ error: "Key pair already exists" });
        }

        const { error: updateErr } = await supabase
            .from("users")
            .update({
                public_key: publicKeySpkiB64,
                encrypted_private_key: encryptedPrivateKeyB64,
                private_key_iv: privateKeyIvB64,
                asymmetric_key_algorithm: asymmetricKeyAlgorithm || "RSA-OAEP",
                asymmetric_key_length: asymmetricKeyLength || 2048,
                asymmetric_hash: asymmetricHash || "SHA-256",
            } as any)
            .eq("id", userId);

        if (updateErr) return res.status(500).json({ error: updateErr.message });
        return res.status(200).json({ ok: true });
    } catch (e) {
        console.error("uploadKeyPair error:", e);
        return res.status(500).json({ error: "Internal server error" });
    }
}